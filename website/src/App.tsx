import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Fragment, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import "./App.css";

// Google Drive direct download URL for results.json
const GOOGLE_DRIVE_FILE_ID = "1GDcy8gqsFB7sXIWfPmGSM4lW0yEjYvcU";
const RESULTS_JSON_URL = `https://drive.google.com/uc?export=download&id=${GOOGLE_DRIVE_FILE_ID}`;

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

// Custom component for polyline with mouse-following tooltip
function EdgeWithTooltip({
  positions,
  color,
  weight,
  opacity,
  originDisplay,
  destinationDisplay,
  pingDisplay,
}: {
  positions: [[number, number], [number, number]];
  color: string;
  weight: number;
  opacity: number;
  originDisplay: string;
  destinationDisplay: string;
  pingDisplay: string;
}) {
  const [tooltipPosition, setTooltipPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [isHovering, setIsHovering] = useState(false);
  const polylineRef = useRef<L.Polyline>(null);
  const map = useMap();
  const tooltipRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const polyline = polylineRef.current;
    if (!polyline) return;

    const handleMouseMove = (e: L.LeafletMouseEvent) => {
      const containerPoint = map.latLngToContainerPoint(e.latlng);
      setTooltipPosition({ x: containerPoint.x, y: containerPoint.y });
      setIsHovering(true);
    };

    const handleMouseOut = () => {
      setIsHovering(false);
      setTooltipPosition(null);
    };

    polyline.on("mousemove", handleMouseMove);
    polyline.on("mouseout", handleMouseOut);

    return () => {
      polyline.off("mousemove", handleMouseMove);
      polyline.off("mouseout", handleMouseOut);
    };
  }, [map]);

  // Get the map container element for portal
  const mapContainer = map.getContainer();

  return (
    <>
      <Polyline
        ref={polylineRef}
        positions={positions}
        color={color}
        weight={weight}
        opacity={opacity}
        pathOptions={{
          interactive: true,
          className: "network-edge",
        }}
      />
      {isHovering &&
        tooltipPosition &&
        mapContainer &&
        createPortal(
          <div
            ref={tooltipRef}
            className="edge-tooltip"
            style={{
              position: "absolute",
              left: `${tooltipPosition.x}px`,
              top: `${tooltipPosition.y - 10}px`,
              transform: "translate(-50%, -100%)",
              pointerEvents: "none",
              zIndex: 1000,
              backgroundColor: "rgba(0, 0, 0, 0.8)",
              color: "white",
              padding: "8px 12px",
              borderRadius: "4px",
              fontSize: "12px",
              whiteSpace: "nowrap",
              boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
            }}
          >
            <div style={{ textAlign: "center" }}>
              <div>
                <strong>Origin:</strong> {originDisplay}
              </div>
              <div>
                <strong>Destination:</strong> {destinationDisplay}
              </div>
              <div>
                <strong>Ping Time:</strong> {pingDisplay}
              </div>
            </div>
          </div>,
          mapContainer
        )}
    </>
  );
}

function MapContent({ data }: { data: ResultsData }) {
  const map = useMap();

  useEffect(() => {
    // Fit map to show all markers
    const bounds: L.LatLngBoundsExpression = [];

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
  }, [map, data]);

  return null;
}

function App() {
  const [data, setData] = useState<ResultsData>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch results.json from Google Drive
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(RESULTS_JSON_URL);

        if (!response.ok) {
          throw new Error(`Failed to fetch data: ${response.statusText}`);
        }

        const jsonData = await response.json();
        setData(jsonData as ResultsData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load data");
        console.error("Error fetching results.json:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

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

  if (loading) {
    return (
      <div
        style={{
          width: "100vw",
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div>Loading map data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          width: "100vw",
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
        }}
      >
        <div style={{ color: "red", marginBottom: "10px" }}>
          Error loading data
        </div>
        <div style={{ color: "gray" }}>{error}</div>
      </div>
    );
  }

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
        <MapContent data={data} />

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
          const positions = [
            [entry.origin_geo.latitude, entry.origin_geo.longitude],
            [entry.destination_geo.latitude, entry.destination_geo.longitude],
          ] as [[number, number], [number, number]];

          // Format origin and destination for display
          const originDisplay =
            entry.origin === "unknown"
              ? "Unknown"
              : `${entry.origin_geo.city}, ${entry.origin_geo.country}`;
          const destinationDisplay = `${entry.destination_geo.city}, ${entry.destination_geo.country}`;
          const pingDisplay =
            entry.pingTime !== null && entry.pingTime !== undefined
              ? `${entry.pingTime} ms`
              : "N/A";

          return (
            <Fragment key={`edge-group-${index}`}>
              {/* Border effect - render a darker, thicker line underneath */}
              <Polyline
                positions={positions}
                color="#000000"
                weight={5}
                opacity={0.3}
                pathOptions={{
                  interactive: false,
                }}
              />
              {/* Main colored line on top */}
              <EdgeWithTooltip
                positions={positions}
                color={color}
                weight={3}
                opacity={0.8}
                originDisplay={originDisplay}
                destinationDisplay={destinationDisplay}
                pingDisplay={pingDisplay}
              />
            </Fragment>
          );
        })}
      </MapContainer>
    </div>
  );
}

export default App;
