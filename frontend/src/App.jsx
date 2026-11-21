
import { useEffect, useState } from "react";
import L from "leaflet";
import {
  MapContainer,
  TileLayer,
  GeoJSON,
  useMapEvents
} from "react-leaflet";

const API = "http://localhost:8000";

function MapEvents({ onBoundsChange }) {
  useMapEvents({
    moveend(event) {
      const bounds = event.target.getBounds();

      const bbox = [
        bounds.getWest(),
        bounds.getSouth(),
        bounds.getEast(),
        bounds.getNorth()
      ].join(",");

      onBoundsChange(bbox);
    }
  });

  return null;
}

export default function App() {
  const [data, setData] = useState(null);
  const [status, setStatus] = useState("Loading map data...");
  const [showPoints, setShowPoints] = useState(true);
  const [uploading, setUploading] = useState(false);

  async function loadFeatures(
    bbox = "73.75,18.40,74.00,18.65"
  ) {
    try {
      setStatus("Loading features...");

      const response = await fetch(
        `${API}/api/features?bbox=${encodeURIComponent(bbox)}`
      );

      if (!response.ok) {
        throw new Error("Could not retrieve features");
      }

      const result = await response.json();

      setData(result);
      setStatus(`${result.features.length} features loaded`);

    } catch (error) {
      setStatus(error.message);
    }
  }

  async function handleUpload(event) {
    const file = event.target.files[0];

    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".geojson") &&
        !file.name.toLowerCase().endsWith(".json")) {
      alert("Please select a GeoJSON or JSON file.");
      event.target.value = "";
      return;
    }

    try {
      setUploading(true);
      setStatus("Uploading GeoJSON...");

      const text = await file.text();
      const geojson = JSON.parse(text);

      const response = await fetch(
        `${API}/api/upload-geojson`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(geojson)
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.detail || "Upload failed");
      }

      alert(
        `Successfully uploaded ${result.features_uploaded} features!`
      );

      await loadFeatures();

    } catch (error) {
      alert("Upload error: " + error.message);
      setStatus(error.message);

    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  useEffect(() => {
    loadFeatures();
  }, []);

  return (
    <main className="app">

      <header className="topbar">
        <div>
          <div className="eyebrow">
            GEOSPATIAL DATA PLATFORM
          </div>
          <h1>Web-Based GIS</h1>
        </div>

        <span className="live">
          ● API-connected demo
        </span>
      </header>

      <section className="workspace">

        <aside className="sidebar">

          <h2>Map Controls</h2>

          <p className="muted">
            Explore geographical locations and upload
            your own GIS datasets.
          </p>

          <div className="upload-section">
            <h3>Upload GeoJSON</h3>

            <p>
              Select a .geojson or .json file to add
              geographical features.
            </p>

            <input
              type="file"
              accept=".geojson,.json,application/geo+json,application/json"
              onChange={handleUpload}
              disabled={uploading}
            />

            {uploading && (
              <p>Uploading your dataset...</p>
            )}
          </div>

          <div className="layer-section">
            <h3>Map Layers</h3>

            <label className="layer-toggle">
              <input
                type="checkbox"
                checked={showPoints}
                onChange={(event) =>
                  setShowPoints(event.target.checked)
                }
              />

              Sample and uploaded features
            </label>
          </div>

          <button
            onClick={() => loadFeatures()}
            disabled={uploading}
          >
            Refresh Map Data
          </button>

          <div className="status">
            <strong>Application Status</strong>
            <p>{status}</p>
          </div>

          <div className="hint">
            <strong>How to use</strong>
            <p>
              Upload GeoJSON datasets, zoom into the map
              and click markers to view their details.
            </p>
          </div>

          <div className="tech">
            React · Leaflet · FastAPI · PostGIS
          </div>

        </aside>

        <section className="map-panel">

          <MapContainer
            center={[18.5204, 73.8567]}
            zoom={12}
            scrollWheelZoom={true}
            className="map"
          >

            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <MapEvents
              onBoundsChange={(bbox) => loadFeatures(bbox)}
            />

            {showPoints && data && (
              <GeoJSON
                key={JSON.stringify(data)}
                data={data}
                pointToLayer={(feature, latlng) =>
                  L.circleMarker(latlng, {
                    radius: 8,
                    color: "#155eef",
                    fillColor: "#528bff",
                    fillOpacity: 0.9,
                    weight: 2
                  })
                }
                onEachFeature={(feature, layer) => {
                  const properties =
                    feature.properties || {};

                  layer.bindPopup(`
                    <strong>${properties.name || "Unnamed"}</strong>
                    <br/>
                    Category: ${properties.category || "N/A"}
                  `);
                }}
                style={{
                  color: "#155eef",
                  weight: 3,
                  fillColor: "#528bff",
                  fillOpacity: 0.3
                }}
              />
            )}

          </MapContainer>

        </section>

      </section>

      <footer>
        Web-Based GIS Application · PostGIS Spatial Database
      </footer>

    </main>
  );
}
