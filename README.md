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
# Web-Based GIS Application

A Web-Based Geographic Information System (GIS) application that allows users to visualize geographic data on an interactive map and upload GeoJSON files for visualization.

The application uses React, Leaflet, FastAPI, PostgreSQL, PostGIS, and Docker.

## 1. Project Overview

The purpose of this project is to develop a web-based GIS platform that makes it easier to visualize and manage geographic information through a web browser.

### Main Technologies

- **Frontend:** React.js
- **Map Library:** Leaflet
- **Backend:** Python FastAPI
- **Database:** PostgreSQL
- **Spatial Database Extension:** PostGIS
- **Containerization:** Docker and Docker Compose
- **Version Control:** Git and GitHub

## 2. Features

Current implementation:

- Interactive map using Leaflet.
- Geographic data visualization.
- Backend API using FastAPI.
- PostgreSQL database integration.
- PostGIS spatial data support.
- GeoJSON file upload functionality (implementation/testing in progress).
- Docker-based application setup.

Additional GIS features will be added as development progresses.

## 3. Project Structure

```text
web-based-gis/
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── style.css
│   ├── package.json
│   └── Dockerfile
│
├── backend/
│   ├── app/
│   │   └── main.py
│   ├── requirements.txt
│   └── Dockerfile
│
├── database/
│   └── init.sql
│
├── sample-data/
│   └── test-pune.geojson
│
├── docker-compose.yml
├── README.md
└── .gitignore
```

## 4. Basic Requirements

Before running the project, install the following software:

| Software | Purpose |
|---|---|
| Windows 10/11 | Operating system |
| Docker Desktop | Runs application containers |
| Docker Compose | Manages multiple containers |
| Visual Studio Code | Code editor |
| Git | Version control |
| Google Chrome or another browser | Access the application |

### Important

Docker Desktop should be installed and configured with the WSL 2 backend on Windows.

You do not need to install Python, Node.js, or PostgreSQL separately on your computer if you use the provided Docker setup. Their required environments run inside containers.

## 5. Installation and Setup

Follow these instructions to run the project from scratch.

### Step 1: Clone the Repository

Open PowerShell or the VS Code terminal and execute:

```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git
```

Replace the repository URL with the actual GitHub repository URL.

### Step 2: Open the Project

Navigate into the downloaded folder:

```bash
cd web-based-gis
```

Open it in Visual Studio Code:

```bash
code .
```

### Step 3: Start Docker Desktop

1. Open Docker Desktop.
2. Wait until Docker has started successfully.
3. Make sure the Docker engine is running.

Verify Docker:

```bash
docker --version
```

Verify Docker Compose:

```bash
docker compose version
```

### Step 4: Build and Run the Application

From the root project directory, execute:

```bash
docker compose up --build -d
```

This command builds the required Docker images and starts the frontend, backend, and database services.

### Step 5: Check Running Containers

Execute:

```bash
docker compose ps
```

Make sure the frontend and backend containers are running and the database is healthy.

### Step 6: Access the Application

Open your web browser and visit:

| Component | URL |
|---|---|
| GIS Frontend | http://localhost:5173 |
| Backend API | http://localhost:8000 |
| API Documentation | http://localhost:8000/docs |
| Backend Health Check | http://localhost:8000/health |

## 6. How to Upload GeoJSON Data

1. Start the application.
2. Open http://localhost:5173.
3. Locate the GeoJSON upload section.
4. Select a valid `.geojson` file.
5. Upload the file.
6. View the geographic features on the interactive map.

A sample GeoJSON file is provided in the `sample-data/` directory.

## 7. Docker Commands

### Start the Application

```bash
docker compose up -d
```

### Rebuild the Application

```bash
docker compose up --build -d
```

### Stop the Application

```bash
docker compose down
```

### View Running Containers

```bash
docker compose ps
```

### View Backend Logs

```bash
docker compose logs backend
```

### View Frontend Logs

```bash
docker compose logs frontend
```

### View Database Logs

```bash
docker compose logs db
```

### Stop Containers and Remove Database Volume

```bash
docker compose down -v
```

**Warning:** The last command deletes the database volume and its stored data. Do not use it unless you intentionally want to reset the database.

## 8. API Documentation

FastAPI provides interactive API documentation.

After starting the application, visit:

http://localhost:8000/docs

You can explore and test the available backend API endpoints from this page.

## 9. Database

The application uses PostgreSQL with the PostGIS extension to support geographic data storage and spatial operations.

PostGIS allows the database to store and work with geographic objects such as:

- Points
- Lines
- Polygons
- MultiPoints
- MultiLineStrings
- MultiPolygons

Database configuration is managed through Docker Compose.

## 10. Troubleshooting

### Docker is not running

Open Docker Desktop and wait for the engine to start.

### Frontend is not opening

Check the frontend logs:

```bash
docker compose logs frontend
```

### Backend API is not responding

Check the backend logs:

```bash
docker compose logs backend
```

### Database connection error

Check the database container:

```bash
docker compose ps
```

Then inspect database logs:

```bash
docker compose logs db
```

### Port is already in use

Another application may be using port 5173 or 8000. Stop the conflicting application or configure a different port in Docker Compose.

## 11. Stopping the Application

To stop the application without deleting database data:

```bash
docker compose down
```

To start it again later:

```bash
docker compose up -d
```

## 12. Version Control and GitHub

To upload project changes to GitHub:

```bash
git add .
git commit -m "Update Web-Based GIS application"
git push
```

Make sure sensitive information, passwords, environment files, and unnecessary generated files are excluded using `.gitignore`.

## 13. Future Enhancements

Planned improvements include:

- Advanced GIS layer management.
- Spatial analysis tools.
- Buffer analysis.
- Area and distance calculations.
- Improved map visualization.
- Geographic feature filtering.
- Additional spatial queries.

## 14. License

This project is developed for educational and research purposes.

---

**Project:** Web-Based GIS Application

**Technologies:** React, Leaflet, FastAPI, PostgreSQL, PostGIS, Docker

**Repository:** Add your GitHub repository URL here.
