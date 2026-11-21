import { useEffect, useState } from "react";
import L from "leaflet";
import { MapContainer, TileLayer, GeoJSON, useMapEvents } from "react-leaflet";

const API = "http://localhost:8000";

function MapEvents({ onBoundsChange }) {
  useMapEvents({
    moveend(event) {
      const b = event.target.getBounds();
      onBoundsChange([b.getWest(), b.getSouth(), b.getEast(), b.getNorth()].join(","));
    }
  });
  return null;
}

export default function App() {
  const [data, setData] = useState(null);
  const [status, setStatus] = useState("Loading map data…");
  const [showPoints, setShowPoints] = useState(true);

  async function loadFeatures(bbox = "73.75,18.40,74.00,18.65") {
    setStatus("Loading features…");
    try {
      const response = await fetch(`${API}/api/features?bbox=${encodeURIComponent(bbox)}`);
      if (!response.ok) throw new Error(`API returned ${response.status}`);
      const result = await response.json();
      setData(result);
      setStatus(`${result.features.length} features loaded from PostGIS`);
    } catch (err) {
      setStatus(`Could not load data: ${err.message}. Check that Docker is running.`);
    }
  }

  useEffect(() => { loadFeatures(); }, []);

  return (
    <main className="app">
      <header className="topbar">
        <div><div className="eyebrow">GEOSPATIAL DATA PLATFORM</div><h1>Web-Based GIS</h1></div>
        <span className="live">● API-connected demo</span>
      </header>
      <section className="workspace">
        <aside className="sidebar">
          <h2>Map controls</h2>
          <p className="muted">Explore demonstration locations around Pune, India.</p>
          <label className="layer-toggle">
            <input type="checkbox" checked={showPoints} onChange={e => setShowPoints(e.target.checked)} />
            Sample locations
          </label>
          <button onClick={() => loadFeatures()}>Refresh map data</button>
          <div className="status"><strong>Status</strong><br />{status}</div>
          <div className="hint"><strong>How to use</strong><p>Pan or zoom the map. The app requests features for the visible map area.</p><p>Click a marker to inspect its name and category.</p></div>
          <div className="tech">React · Leaflet · FastAPI · PostGIS</div>
        </aside>
        <section className="map-panel">
          <MapContainer center={[18.5204, 73.8567]} zoom={12} scrollWheelZoom className="map">
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapEvents onBoundsChange={bbox => loadFeatures(bbox)} />
            {showPoints && data && <GeoJSON
              key={JSON.stringify(data)}
              data={data}
              pointToLayer={(feature, latlng) => L.circleMarker(latlng, {
                radius: 8, color: "#155eef", fillColor: "#528bff", fillOpacity: 0.9, weight: 2
              })}
              onEachFeature={(feature, layer) => {
                const p = feature.properties || {};
                layer.bindPopup(`<strong>${p.name || "Unnamed"}</strong><br/>Category: ${p.category || "N/A"}`);
              }}
            />}
          </MapContainer>
        </section>
      </section>
      <footer>Starter implementation · Sample data only · Spatial queries run in PostGIS</footer>
    </main>
  );
}
