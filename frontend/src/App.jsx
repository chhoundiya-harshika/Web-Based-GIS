
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
  const [layers, setLayers] = useState([]);
  const [status, setStatus] = useState("Loading map data...");

  const [showSample, setShowSample] = useState(true);
  const [showUploaded, setShowUploaded] = useState(true);

  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function loadLayers() {
    try {
      const response = await fetch(`${API}/api/layers`);

      if (!response.ok) {
        throw new Error("Could not retrieve layers.");
      }

      const result = await response.json();
      setLayers(result);

    } catch (error) {
      console.error("Layer loading error:", error);
    }
  }

  async function loadFeatures(
    bbox = "73.75,18.40,74.00,18.65"
  ) {
    try {
      const response = await fetch(
        `${API}/api/features?bbox=${encodeURIComponent(bbox)}`
      );

      if (!response.ok) {
        throw new Error("Could not retrieve map features.");
      }

      const result = await response.json();

      setData(result);

      setStatus(
        `${result.features.length} features loaded`
      );

    } catch (error) {
      setStatus(error.message);
    }
  }

  async function refreshData() {
    setStatus("Refreshing map data...");

    await Promise.all([
      loadFeatures(),
      loadLayers()
    ]);
  }

  async function handleUpload(event) {
    const file = event.target.files[0];

    if (!file) return;

    if (
      !file.name.toLowerCase().endsWith(".geojson") &&
      !file.name.toLowerCase().endsWith(".json")
    ) {
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
        throw new Error(
          result.detail || "Upload failed."
        );
      }

      setShowUploaded(true);

      alert(
        `Successfully uploaded ${result.features_uploaded} features!`
      );

      await refreshData();

    } catch (error) {
      alert("Upload error: " + error.message);
      setStatus(error.message);

    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  async function removeUploadedLayer() {
    const uploadedLayer = layers.find(
      (layer) => layer.id === "uploaded-features"
    );

    if (!uploadedLayer || uploadedLayer.feature_count === 0) {
      alert("There are no uploaded features to remove.");
      return;
    }

    const confirmed = window.confirm(
      "This will permanently delete all uploaded GeoJSON features from the database. Continue?"
    );

    if (!confirmed) return;

    try {
      setDeleting(true);
      setStatus("Removing uploaded layer...");

      const response = await fetch(
        `${API}/api/layers/uploaded-features`,
        {
          method: "DELETE"
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.detail || "Could not remove layer."
        );
      }

      alert(
        `Uploaded layer removed. ${result.deleted_count} features deleted.`
      );

      await refreshData();

    } catch (error) {
      alert(error.message);
      setStatus(error.message);

    } finally {
      setDeleting(false);
    }
  }

  useEffect(() => {
    refreshData();
  }, []);

  const visibleFeatures = data
    ? {
        ...data,
        features: data.features.filter((feature) => {
          const source = feature.properties?.source;

          if (source === "sample") return showSample;
          if (source === "uploaded") return showUploaded;

          return false;
        })
      }
    : null;

  const sampleLayer = layers.find(
    (layer) => layer.id === "sample-points"
  );

  const uploadedLayer = layers.find(
    (layer) => layer.id === "uploaded-features"
  );

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
            Explore geographic locations and manage
            your GIS datasets.
          </p>

          <div className="upload-section">
            <h3>Upload GeoJSON</h3>

            <p>
              Select a .geojson or .json file to add
              geographic features.
            </p>

            <input
              type="file"
              accept=".geojson,.json,application/geo+json,application/json"
              onChange={handleUpload}
              disabled={uploading || deleting}
            />

            {uploading && (
              <p>Uploading your dataset...</p>
            )}
          </div>

          <div className="layer-section">
            <h3>Layer Management</h3>

            <div className="layer-card">

              <label className="layer-toggle">
                <input
                  type="checkbox"
                  checked={showSample}
                  onChange={(event) =>
                    setShowSample(event.target.checked)
                  }
                />

                <span>
                  <strong>Sample Pune Locations</strong>
                  <small>
                    {sampleLayer?.feature_count ?? 0} features
                  </small>
                </span>
              </label>

            </div>

            <div className="layer-card">

              <label className="layer-toggle">
                <input
                  type="checkbox"
                  checked={showUploaded}
                  onChange={(event) =>
                    setShowUploaded(event.target.checked)
                  }
                />

                <span>
                  <strong>Uploaded GeoJSON</strong>
                  <small>
                    {uploadedLayer?.feature_count ?? 0} features
                  </small>
                </span>
              </label>

              <button
                className="remove-layer"
                onClick={removeUploadedLayer}
                disabled={
                  deleting ||
                  uploading ||
                  !uploadedLayer ||
                  uploadedLayer.feature_count === 0
                }
              >
                {deleting ? "Removing..." : "Remove uploaded data"}
              </button>

            </div>
          </div>

          <button
            onClick={refreshData}
            disabled={uploading || deleting}
          >
            Refresh Map and Layers
          </button>

          <div className="status">
            <strong>Application Status</strong>
            <p>{status}</p>
          </div>

          <div className="hint">
            <strong>How to use</strong>
            <p>
              Toggle individual layers to show or hide
              geographic data. Upload GeoJSON files to
              add your own datasets.
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

            {visibleFeatures && (
              <GeoJSON
                key={JSON.stringify(visibleFeatures)}
                data={visibleFeatures}
                pointToLayer={(feature, latlng) =>
                  L.circleMarker(latlng, {
                    radius: 8,
                    color:
                      feature.properties?.source === "uploaded"
                        ? "#15803d"
                        : "#155eef",
                    fillColor:
                      feature.properties?.source === "uploaded"
                        ? "#4ade80"
                        : "#528bff",
                    fillOpacity: 0.9,
                    weight: 2
                  })
                }
                onEachFeature={(feature, layer) => {
                  const properties =
                    feature.properties || {};

                  const content = document.createElement("div");
                  const title = document.createElement("strong");

                  title.textContent =
                    properties.name || "Unnamed";

                  const category = document.createElement("p");
                  category.textContent =
                    `Category: ${properties.category || "N/A"}`;

                  const source = document.createElement("p");
                  source.textContent =
                    `Layer: ${properties.source || "Unknown"}`;

                  content.append(title, category, source);

                  layer.bindPopup(content);
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