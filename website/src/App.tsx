import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useState } from "react";
import { MapContainer, TileLayer } from "react-leaflet";
import "./App.css";

// Fix for default marker icons in React-Leaflet
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";

import { ErrorScreen } from "./components/ErrorScreen";
import { Geozones } from "./components/Geozones";
import { LoadingScreen } from "./components/LoadingScreen";
import { MapBoundsController } from "./components/MapBoundsController";
import { MapLegend } from "./components/MapLegend";
import { ToggleControls } from "./components/ToggleControls";
import { WrappedLocationMarker } from "./components/WrappedLocationMarker";
import { WrappedNetworkEdge } from "./components/WrappedNetworkEdge";
import { useResultsData } from "./hooks/useResultsData";
import { useUniqueNodes } from "./hooks/useUniqueNodes";
import type { ResultEntry } from "./types";

const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [12, 18],
  iconAnchor: [6, 18],
  popupAnchor: [1, -15],
  shadowSize: [15, 15],
});

L.Marker.prototype.options.icon = DefaultIcon;

function App() {
  const { data, loading, error } = useResultsData();
  const nodes = useUniqueNodes(data);
  const [showGeozones, setShowGeozones] = useState(false);
  const [showEdges, setShowEdges] = useState(true);

  if (loading) {
    return <LoadingScreen />;
  }

  if (error) {
    return <ErrorScreen error={error} />;
  }

  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative" }}>
      <MapLegend />
      <ToggleControls
        showGeozones={showGeozones}
        showEdges={showEdges}
        onToggleGeozones={() => setShowGeozones(!showGeozones)}
        onToggleEdges={() => setShowEdges(!showEdges)}
      />
      <MapContainer
        center={[0, 0]}
        zoom={2}
        style={{ width: "100%", height: "100%" }}
        worldCopyJump={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapBoundsController data={data} />

        {/* Render nodes (markers) */}
        {Array.from(nodes.values()).map((geo, index) => (
          <WrappedLocationMarker key={index} geo={geo} index={index} />
        ))}

        {/* Render geozones */}
        <Geozones show={showGeozones} />

        {/* Render edges (polylines) */}
        {showEdges &&
          data.map((entry: ResultEntry, index) => (
            <WrappedNetworkEdge key={index} entry={entry} index={index} />
          ))}
      </MapContainer>
    </div>
  );
}

export default App;
