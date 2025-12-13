import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useCallback, useState } from "react";
import { MapContainer, TileLayer } from "react-leaflet";
import "./App.css";

// Fix for default marker icons in React-Leaflet
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";

import { ErrorScreen } from "./components/ErrorScreen";
import { LoadingScreen } from "./components/LoadingScreen";
import { LocationMarker } from "./components/LocationMarker";
import { MapBoundsController } from "./components/MapBoundsController";
import { MapLegend } from "./components/MapLegend";
import { NetworkEdge } from "./components/NetworkEdge";
import { useResultsData } from "./hooks/useResultsData";
import { useUniqueNodes } from "./hooks/useUniqueNodes";
import type { ResultEntry } from "./types";

const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [20, 30],
  iconAnchor: [10, 30],
  popupAnchor: [1, -25],
  shadowSize: [30, 30],
});

L.Marker.prototype.options.icon = DefaultIcon;

function App() {
  const { data, loading, error } = useResultsData();
  const nodes = useUniqueNodes(data);
  const [highlightedUuid, setHighlightedUuid] = useState<string | null>(null);

  const handleEdgeHover = useCallback((uuid: string | null) => {
    setHighlightedUuid(uuid);
  }, []);

  const handleEdgeHoverOut = useCallback(() => {
    setHighlightedUuid(null);
  }, []);

  if (loading) {
    return <LoadingScreen />;
  }

  if (error) {
    return <ErrorScreen error={error} />;
  }

  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative" }}>
      <MapLegend />
      <MapContainer
        center={[0, 0]}
        zoom={2}
        style={{ width: "100%", height: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapBoundsController data={data} />

        {/* Render nodes (markers) */}
        {Array.from(nodes.values()).map((geo, index) => (
          <LocationMarker key={index} geo={geo} />
        ))}

        {/* Render edges (polylines) */}
        {data.map((entry: ResultEntry, index) => (
          <NetworkEdge
            key={index}
            entry={entry}
            index={index}
            highlightedUuid={highlightedUuid}
            onHover={handleEdgeHover}
            onHoverOut={handleEdgeHoverOut}
          />
        ))}
      </MapContainer>
    </div>
  );
}

export default App;
