import { Fragment } from "react";
import type { ResultEntry } from "../types";
import { calculateDistance, getEdgeColor } from "../utils";
import { BorderPolyline } from "./BorderPolyline";
import { EdgeWithTooltip } from "./EdgeWithTooltip";

interface NetworkEdgeProps {
  entry: ResultEntry;
  index: number;
}

export function NetworkEdge({ entry, index }: NetworkEdgeProps) {
  if (!entry.origin_geo || !entry.destination_geo) {
    return null;
  }

  const color = getEdgeColor(entry.pingTime);
  const positions = [
    [entry.origin_geo.latitude, entry.origin_geo.longitude],
    [entry.destination_geo.latitude, entry.destination_geo.longitude],
  ] as [[number, number], [number, number]];

  // Calculate distance
  const distanceMeters = calculateDistance(
    entry.origin_geo.latitude,
    entry.origin_geo.longitude,
    entry.destination_geo.latitude,
    entry.destination_geo.longitude
  );
  const distanceKm = distanceMeters / 1000;
  const distanceDisplay =
    distanceKm >= 1
      ? `${distanceKm.toFixed(2)} km`
      : `${distanceMeters.toFixed(0)} m`;

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
      <BorderPolyline positions={positions} isHighlighted={false} />
      {/* Main colored line on top */}
      <EdgeWithTooltip
        positions={positions}
        color={color}
        weight={3}
        opacity={0.8}
        originDisplay={originDisplay}
        destinationDisplay={destinationDisplay}
        pingDisplay={pingDisplay}
        distanceDisplay={distanceDisplay}
      />
    </Fragment>
  );
}
