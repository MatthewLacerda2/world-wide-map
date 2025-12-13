import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect } from "react";
import {
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import "./App.css";
import resultsData from "./results.json";

// Fix for default marker icons in React-Leaflet
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";

const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

interface GeoLocation {
  country: string;
  region: string;
  city: string;
  latitude: number;
  longitude: number;
}

interface ResultEntry {
  origin: string;
  destination: string;
  pingTime: number;
  origin_geo?: GeoLocation | null;
  destination_geo?: GeoLocation | null;
}

type ResultsData = ResultEntry[];

function getEdgeColor(pingTime: number): string {
  if (pingTime < 30) return "green";
  if (pingTime < 120) return "yellow";
  return "red";
}

function MapContent() {
  const map = useMap();

  useEffect(() => {
    // Fit map to show all markers
    const bounds: L.LatLngBoundsExpression = [];
    const data = resultsData as ResultsData;

    data.forEach((entry: ResultEntry) => {
      if (entry.origin_geo) {
        bounds.push([entry.origin_geo.latitude, entry.origin_geo.longitude]);
      }
      if (entry.destination_geo) {
        bounds.push([
          entry.destination_geo.latitude,
          entry.destination_geo.longitude,
        ]);
      }
    });

    if (bounds.length > 0) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [map]);

  return null;
}

function App() {
  const data = resultsData as ResultsData;
  // Get unique nodes
  const nodes = new Map<string, GeoLocation>();

  data.forEach((entry: ResultEntry) => {
    if (entry.origin_geo) {
      const key = `${entry.origin_geo.latitude},${entry.origin_geo.longitude}`;
      if (!nodes.has(key)) {
        nodes.set(key, entry.origin_geo);
      }
    }
    if (entry.destination_geo) {
      const key = `${entry.destination_geo.latitude},${entry.destination_geo.longitude}`;
      if (!nodes.has(key)) {
        nodes.set(key, entry.destination_geo);
      }
    }
  });

  // Debug: log unique nodes
  console.log(
    `Found ${nodes.size} unique nodes:`,
    Array.from(nodes.values()).map((g) => `${g.city}, ${g.country}`)
  );

  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <MapContainer
        center={[0, 0]}
        zoom={2}
        style={{ width: "100%", height: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapContent />

        {/* Render nodes (markers) */}
        {Array.from(nodes.values()).map((geo, index) => (
          <Marker key={index} position={[geo.latitude, geo.longitude]}>
            <Popup>
              {geo.city}, {geo.region}, {geo.country}
            </Popup>
          </Marker>
        ))}

        {/* Render edges (polylines) */}
        {data.map((entry: ResultEntry, index) => {
          if (!entry.origin_geo || !entry.destination_geo) {
            return null;
          }

          const color = getEdgeColor(entry.pingTime);

          return (
            <Polyline
              key={index}
              positions={[
                [entry.origin_geo.latitude, entry.origin_geo.longitude],
                [
                  entry.destination_geo.latitude,
                  entry.destination_geo.longitude,
                ],
              ]}
              color={color}
              weight={2}
              opacity={0.7}
            />
          );
        })}
      </MapContainer>
    </div>
  );
}

export default App;
