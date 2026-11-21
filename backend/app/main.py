import os
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
import psycopg
from psycopg.rows import dict_row

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://gisuser:gispassword@localhost:5432/webgis")
app = FastAPI(title="Web GIS API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_connection():
    return psycopg.connect(DATABASE_URL, row_factory=dict_row)

@app.get("/health")
def health():
    try:
        with get_connection() as conn:
            conn.execute("SELECT 1")
        return {"status": "ok", "database": "connected"}
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Database unavailable") from exc

@app.get("/api/layers")
def layers():
    return [{"id": "sample-points", "name": "Sample locations", "geometry_type": "Point"}]

@app.get("/api/features")
def get_features(bbox: str = Query(default="73.75,18.40,74.00,18.65")):
    try:
        west, south, east, north = [float(v) for v in bbox.split(",")]
        if west >= east or south >= north:
            raise ValueError("Minimum coordinates must be smaller than maximum coordinates.")
        if not (-180 <= west <= 180 and -180 <= east <= 180):
            raise ValueError("Longitude must be between -180 and 180.")
        if not (-90 <= south <= 90 and -90 <= north <= 90):
            raise ValueError("Latitude must be between -90 and 90.")
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=f"Invalid bbox: {exc}") from exc

    sql = """
        SELECT id, name, category, ST_AsGeoJSON(geom)::json AS geometry
        FROM gis_features
        WHERE geom && ST_MakeEnvelope(%s, %s, %s, %s, 4326)
        ORDER BY id
    """
    try:
        with get_connection() as conn:
            rows = conn.execute(sql, (west, south, east, north)).fetchall()
        return {
            "type": "FeatureCollection",
            "features": [
                {
                    "type": "Feature",
                    "id": row["id"],
                    "geometry": row["geometry"],
                    "properties": {"name": row["name"], "category": row["category"]},
                }
                for row in rows
            ],
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Could not retrieve map features") from exc
