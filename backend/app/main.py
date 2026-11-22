
import os
import json

from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
import psycopg
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


# Create a separate table for uploaded GeoJSON features.
@app.on_event("startup")
def create_uploaded_features_table():
    with get_connection() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS uploaded_features (
                id SERIAL PRIMARY KEY,
                name TEXT,
                category TEXT,
                geom geometry(Geometry, 4326) NOT NULL
            )
        """)
        conn.execute("""
            CREATE INDEX IF NOT EXISTS
            uploaded_features_geom_idx
            ON uploaded_features USING GIST (geom)
        """)


@app.get("/health")
def health():
    try:
        with get_connection() as conn:
            conn.execute("SELECT 1")

        return {
            "status": "ok",
            "database": "connected"
        }

    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail="Database unavailable"
        ) from exc


@app.get("/api/layers")
def layers():
    try:
        with get_connection() as conn:
            sample_count = conn.execute(
                "SELECT COUNT(*) AS total FROM gis_features"
            ).fetchone()["total"]

            uploaded_count = conn.execute(
                "SELECT COUNT(*) AS total FROM uploaded_features"
            ).fetchone()["total"]

        return [
            {
                "id": "sample-points",
                "name": "Sample Pune Locations",
                "feature_count": sample_count,
                "type": "sample"
            },
            {
                "id": "uploaded-features",
                "name": "Uploaded GeoJSON",
                "feature_count": uploaded_count,
                "type": "uploaded"
            }
        ]

    except Exception as exc:
        print("Layer retrieval error:", str(exc))
        raise HTTPException(
            status_code=500,
            detail="Could not retrieve map layers"
        ) from exc

@app.get("/api/features")
def get_features(
    bbox: str = Query(default="73.75,18.40,74.00,18.65")
):
    try:
        west, south, east, north = [
            float(v) for v in bbox.split(",")
        ]

        if west >= east or south >= north:
            raise ValueError("Invalid bounding box.")

        if not (
            -180 <= west <= 180
            and -180 <= east <= 180
            and -90 <= south <= 90
            and -90 <= north <= 90
        ):
            raise ValueError("Coordinates are outside valid ranges.")

    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid bbox: {exc}"
        ) from exc

    sql = """
        SELECT id, name, category,
               ST_AsGeoJSON(geom)::json AS geometry,
               'sample' AS source
        FROM gis_features
        WHERE geom && ST_MakeEnvelope(%s, %s, %s, %s, 4326)

        UNION ALL

        SELECT id, name, category,
               ST_AsGeoJSON(geom)::json AS geometry,
               'uploaded' AS source
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

        return {
            "type": "FeatureCollection",
            "features": [
                {
                    "type": "Feature",
                    "id": row["id"],
                    "geometry": row["geometry"],
                    "properties": {
                        "name": row["name"],
                        "category": row["category"],
                        "source": row["source"]
                    }
                }
                for row in rows
            ]
        }

    except Exception as exc:
        print("Feature retrieval error:", str(exc))
        raise HTTPException(
            status_code=500,
            detail="Could not retrieve map features"
        ) from exc
# Upload GeoJSON FeatureCollection.
@app.post("/api/upload-geojson")
async def upload_geojson(request: Request):

    # Read and check the uploaded JSON request.
    raw_body = await request.body()

    if len(raw_body) > 5 * 1024 * 1024:
        raise HTTPException(
            status_code=413,
            detail="File is too large. Maximum size is 5 MB."
        )

    try:
        data = json.loads(raw_body)
    except (json.JSONDecodeError, UnicodeDecodeError):
        raise HTTPException(
            status_code=400,
            detail="Invalid JSON file."
        )

    if not isinstance(data, dict) or data.get("type") != "FeatureCollection":
        raise HTTPException(
            status_code=400,
            detail="Please upload a valid GeoJSON FeatureCollection."
        )

    features = data.get("features")

    if not isinstance(features, list) or not features:
        raise HTTPException(
            status_code=400,
            detail="The GeoJSON file contains no features."
        )

    if len(features) > 1000:
        raise HTTPException(
            status_code=400,
            detail="Maximum 1000 features are allowed per upload."
        )

    allowed_geometry_types = {
        "Point",
        "MultiPoint",
        "LineString",
        "MultiLineString",
        "Polygon",
        "MultiPolygon"
    }

    inserted_count = 0

    try:
        with get_connection() as conn:

            for feature in features:

                if not isinstance(feature, dict) or feature.get("type") != "Feature":
                    raise HTTPException(
                        status_code=400,
                        detail="Every item must be a GeoJSON Feature."
                    )

                geometry = feature.get("geometry")

                if not isinstance(geometry, dict):
                    raise HTTPException(
                        status_code=400,
                        detail="A feature has missing or invalid geometry."
                    )

                if geometry.get("type") not in allowed_geometry_types:
                    raise HTTPException(
                        status_code=400,
                        detail="Unsupported or invalid geometry type."
                    )

                properties = feature.get("properties") or {}

                if not isinstance(properties, dict):
                    properties = {}

                name = str(properties.get("name", "Uploaded feature"))[:255]
                category = str(properties.get("category", "Uploaded"))[:100]

                conn.execute(
                    """
                    INSERT INTO uploaded_features (name, category, geom)
                    VALUES (
                        %s,
                        %s,
                        ST_SetSRID(
                            ST_GeomFromGeoJSON(%s),
                            4326
                        )
                    )
                    """,
                    (
                        name,
                        category,
                        json.dumps(geometry)
                    )
                )

                inserted_count += 1

    except HTTPException:
        raise

    except Exception as exc:
        print("GeoJSON upload error:", str(exc))
        raise HTTPException(
            status_code=400,
            detail="Could not save GeoJSON features. Check geometry and database."
        ) from exc

    return {
        "status": "success",
        "message": "GeoJSON uploaded successfully.",
        "features_uploaded": inserted_count
    }
@app.delete("/api/layers/uploaded-features")
def delete_uploaded_features():
    try:
        with get_connection() as conn:
            result = conn.execute(
                "DELETE FROM uploaded_features"
            )

        return {
            "status": "success",
            "message": "Uploaded GeoJSON layer cleared.",
            "deleted_count": result.rowcount
        }

    except Exception as exc:
        print("Layer deletion error:", str(exc))
        raise HTTPException(
            status_code=500,
            detail="Could not remove uploaded layer"
        ) from exc
