
import os
import json

import psycopg
from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from psycopg.rows import dict_row

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://gisuser:gispassword@localhost:5432/webgis"
)

app = FastAPI(title="Web GIS API", version="0.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_connection():
    return psycopg.connect(DATABASE_URL, row_factory=dict_row)


@app.on_event("startup")
def create_uploaded_table():
    with get_connection() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS uploaded_features (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                category TEXT NOT NULL DEFAULT 'Uploaded',
                geom geometry(Geometry, 4326) NOT NULL
            )
        """)
        conn.execute("""
            CREATE INDEX IF NOT EXISTS uploaded_features_geom_gix
            ON uploaded_features USING GIST (geom)
        """)


@app.get("/health")
def health():
    try:
        with get_connection() as conn:
            conn.execute("SELECT 1")
        return {"status": "ok", "database": "connected"}
    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail="Database unavailable"
        ) from exc


@app.get("/api/layers")
def layers():
    return [
        {
            "id": "sample-points",
            "name": "Sample locations",
            "geometry_type": "Point"
        },
        {
            "id": "uploaded-data",
            "name": "Uploaded features",
            "geometry_type": "GeoJSON"
        }
    ]


@app.get("/api/features")
def get_features(
    bbox: str = Query(default="73.75,18.40,74.00,18.65")
):
    try:
        west, south, east, north = [
            float(value) for value in bbox.split(",")
        ]

        if west >= east or south >= north:
            raise ValueError("Invalid bounding box")

        if not (-180 <= west <= 180 and -180 <= east <= 180):
            raise ValueError("Invalid longitude")

        if not (-90 <= south <= 90 and -90 <= north <= 90):
            raise ValueError("Invalid latitude")

    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid bbox: {exc}"
        ) from exc

    sql = """
        SELECT id, name, category,
               ST_AsGeoJSON(geom)::json AS geometry
        FROM gis_features
        WHERE geom && ST_MakeEnvelope(%s, %s, %s, %s, 4326)

        UNION ALL

        SELECT id, name, category,
               ST_AsGeoJSON(geom)::json AS geometry
        FROM uploaded_features
        WHERE geom && ST_MakeEnvelope(%s, %s, %s, %s, 4326)
    """

    try:
        with get_connection() as conn:
            rows = conn.execute(
                sql,
                (
                    west, south, east, north,
                    west, south, east, north
                )
            ).fetchall()

        features = []

        for row in rows:
            features.append({
                "type": "Feature",
                "id": row["id"],
                "geometry": row["geometry"],
                "properties": {
                    "name": row["name"],
                    "category": row["category"]
                }
            })

        return {
            "type": "FeatureCollection",
            "features": features
        }

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail="Could not retrieve features"
        ) from exc


@app.post("/api/upload-geojson")
async def upload_geojson(request: Request):

    try:
        raw_data = await request.body()

        if len(raw_data) > 5 * 1024 * 1024:
            raise HTTPException(
                status_code=413,
                detail="File must be smaller than 5 MB"
            )

        geojson = json.loads(raw_data)

        if geojson.get("type") != "FeatureCollection":
            raise HTTPException(
                status_code=400,
                detail="Only GeoJSON FeatureCollection is supported"
            )

        features = geojson.get("features")

        if not isinstance(features, list) or not features:
            raise HTTPException(
                status_code=400,
                detail="No features found in the file"
            )

        if len(features) > 1000:
            raise HTTPException(
                status_code=400,
                detail="Maximum 1000 features allowed per upload"
            )

    except HTTPException:
        raise
    except (json.JSONDecodeError, UnicodeDecodeError):
        raise HTTPException(
            status_code=400,
            detail="Invalid JSON file"
        )

    inserted = 0

    try:
        with get_connection() as conn:
            for feature in features:

                if not isinstance(feature, dict) or feature.get("type") != "Feature":
                    raise ValueError("Invalid GeoJSON feature")

                geometry = feature.get("geometry")

                if not isinstance(geometry, dict):
                    raise ValueError("Feature has no valid geometry")

                if geometry.get("type") not in [
                    "Point", "MultiPoint",
                    "LineString", "MultiLineString",
                    "Polygon", "MultiPolygon"
                ]:
                    raise ValueError("Unsupported geometry type")

                properties = feature.get("properties") or {}

                if not isinstance(properties, dict):
                    raise ValueError("Feature properties must be an object")

                name = str(properties.get("name") or f"Uploaded feature {inserted + 1}")
                category = str(properties.get("category") or "Uploaded")

                if len(name) > 200 or len(category) > 100:
                    raise ValueError("Feature name or category is too long")

                conn.execute(
                    """
                    INSERT INTO uploaded_features (name, category, geom)
                    VALUES (
                        %s, %s,
                        ST_SetSRID(ST_GeomFromGeoJSON(%s), 4326)
                    )
                    """,
                    (name, category, json.dumps(geometry))
                )

                inserted += 1

    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=400,
            detail="Could not store GeoJSON geometries. Check their coordinates and geometry validity."
        ) from exc

    return {
        "message": "GeoJSON uploaded successfully",
        "features_uploaded": inserted
    }
