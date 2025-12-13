import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Fragment, useCallback, useEffect, useRef, useState } from "react";
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

// GitHub Gist raw URL for results.json
const RESULTS_JSON_URL =
  "https://gist.githubusercontent.com/MatthewLacerda2/e087768cee30773ac20c7eec2e16fdfb/raw/results.json";

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
  uuid?: string;
}

type ResultsData = ResultEntry[];

function getEdgeColor(pingTime: number): string {
  if (pingTime < 30) return "green";
  if (pingTime < 90) return "yellow";
  return "red";
}

// Component for border polyline that updates dynamically
function BorderPolyline({
  positions,
  isHighlighted,
}: {
  positions: [[number, number], [number, number]];
  isHighlighted: boolean;
}) {
  const polylineRef = useRef<L.Polyline>(null);

  useEffect(() => {
    const polyline = polylineRef.current;
    if (!polyline) return;

    const borderWeight = isHighlighted ? 9 : 5;

    polyline.setStyle({
      color: "#000000",
      weight: borderWeight,
      opacity: 0.3,
    });
  }, [isHighlighted]);

  return (
    <Polyline
      ref={polylineRef}
      positions={positions}
      color="#000000"
      weight={isHighlighted ? 9 : 5}
      opacity={isHighlighted ? 1 : 0.3}
      pathOptions={{
        interactive: false,
      }}
    />
  );
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
  uuid,
  highlightedUuid,
  onHover,
  onHoverOut,
}: {
  positions: [[number, number], [number, number]];
  color: string;
  weight: number;
  opacity: number;
  originDisplay: string;
  destinationDisplay: string;
  pingDisplay: string;
  uuid?: string;
  highlightedUuid?: string | null;
  onHover: (uuid: string | null) => void;
  onHoverOut: () => void;
}) {
  const [tooltipPosition, setTooltipPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [isHovering, setIsHovering] = useState(false);
  const polylineRef = useRef<L.Polyline>(null);
  const map = useMap();
  const tooltipRef = useRef<HTMLDivElement | null>(null);

  const isHighlighted = uuid && highlightedUuid === uuid;

  // Update polyline style when highlight state changes - just increase weight slightly
  useEffect(() => {
    const polyline = polylineRef.current;
    if (!polyline) return;

    const displayWeight = isHighlighted ? weight + 1 : weight;

    // Update the Leaflet polyline style directly - keep original color
    polyline.setStyle({
      color: color,
      weight: displayWeight,
      opacity: opacity,
    });
  }, [isHighlighted, color, weight, opacity]);

  useEffect(() => {
    const polyline = polylineRef.current;
    if (!polyline) return;

    const handleMouseMove = (e: L.LeafletMouseEvent) => {
      const containerPoint = map.latLngToContainerPoint(e.latlng);
      setTooltipPosition({ x: containerPoint.x, y: containerPoint.y });
      setIsHovering(true);
      onHover(uuid || null);
    };

    const handleMouseOut = () => {
      setIsHovering(false);
      setTooltipPosition(null);
      onHoverOut();
    };

    polyline.on("mousemove", handleMouseMove);
    polyline.on("mouseout", handleMouseOut);

    return () => {
      polyline.off("mousemove", handleMouseMove);
      polyline.off("mouseout", handleMouseOut);
    };
  }, [map, onHover, onHoverOut, uuid]);

  // Get the map container element for portal
  const mapContainer = map.getContainer();

  // Use highlighted style if this edge is part of the highlighted UUID group
  const displayWeight = isHighlighted ? weight + 1 : weight;

  return (
    <>
      <Polyline
        ref={polylineRef}
        positions={positions}
        color={color}
        weight={displayWeight}
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
  const [highlightedUuid, setHighlightedUuid] = useState<string | null>(null);

  const handleEdgeHover = useCallback((uuid: string | null) => {
    setHighlightedUuid(uuid);
  }, []);

  const handleEdgeHoverOut = useCallback(() => {
    setHighlightedUuid(null);
  }, []);

  // Fetch results.json from GitHub Gist
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
    <div style={{ width: "100vw", height: "100vh", position: "relative" }}>
      {/* Color coding legend */}
      <div
        style={{
          position: "absolute",
          bottom: "10px",
          left: "10px",
          background:
            "linear-gradient(135deg, rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.5))",
          padding: "10px 15px",
          borderRadius: "8px",
          zIndex: 1000,
          fontSize: "14px",
          fontFamily: "Arial, sans-serif",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ color: "white", fontWeight: "bold" }}>
          <span style={{ color: "green" }}>Green</span> is 35ms.
        </div>
        <div style={{ color: "white", fontWeight: "bold" }}>
          <span style={{ color: "#FFD700" }}>Yellow</span> is 120ms.
        </div>
        <div style={{ color: "white", fontWeight: "bold" }}>
          <span style={{ color: "red" }}>Red</span> is more than 120ms.
        </div>
      </div>
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

          const isHighlighted: boolean = !!(
            entry.uuid && highlightedUuid === entry.uuid
          );

          return (
            <Fragment
              key={`edge-group-${index}-${
                isHighlighted ? "highlighted" : "normal"
              }`}
            >
              {/* Border effect - render a darker, thicker line underneath */}
              <BorderPolyline
                positions={positions}
                isHighlighted={isHighlighted}
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
                uuid={entry.uuid}
                highlightedUuid={highlightedUuid}
                onHover={handleEdgeHover}
                onHoverOut={handleEdgeHoverOut}
              />
            </Fragment>
          );
        })}
      </MapContainer>
    </div>
  );
}

export default App;
