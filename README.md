# Web-Based GIS Application

A beginner-friendly starter based on the research paper *Web-Based GIS Application: Implementing a Map-Based Data System*.

## Included in this first implementation

- Interactive Leaflet map centered on Pune.
- Sample point features stored in PostgreSQL + PostGIS.
- FastAPI REST API returning GeoJSON FeatureCollections.
- Bounding-box filtering using PostGIS.
- GiST spatial index on the geometry column.
- Docker Compose setup for database, API, and frontend.

## Requirements

- Windows 10/11
- Docker Desktop (includes Docker Compose)
- Git (for publishing to GitHub)
- Modern browser

## Run locally

1. Install Docker Desktop: https://www.docker.com/products/docker-desktop/
2. Start Docker Desktop and wait until it says Docker is running.
3. Open PowerShell in this project folder.
4. Run:

   ```powershell
   docker compose up --build
   ```

5. Open:
   - Web application: http://localhost:5173
   - API documentation: http://localhost:8000/docs
   - API health: http://localhost:8000/health

Keep the PowerShell window open while using the app. Stop with `Ctrl+C`, then run `docker compose down`.

To completely reset the sample database (this deletes its stored data):

```powershell
docker compose down -v
```

## Publish to GitHub

Create an empty repository on GitHub, then run in PowerShell from this folder:

```powershell
git init
git add .
git commit -m "Initial Web GIS implementation"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/web-based-gis.git
git push -u origin main
```

Replace `YOUR_USERNAME` with your GitHub username.

## API endpoints

- `GET /health` — checks API/database connectivity.
- `GET /api/layers` — lists available layers.
- `GET /api/features?bbox=west,south,east,north` — returns matching features as GeoJSON.

Example: `http://localhost:8000/api/features?bbox=73.75,18.40,74.00,18.65`

## Current scope and limitations

This is a working starter, not the complete research-paper system. It does not yet include GeoJSON upload, polygon drawing, vector tiles, authentication, horizontal scaling, or performance benchmarking. The sample locations are demonstration data, not authoritative GIS data. OpenStreetMap basemap tiles require internet access.

Never commit real passwords or production secrets to GitHub.
