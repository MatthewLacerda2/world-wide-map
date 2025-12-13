import { Fragment } from "react";
import type { ResultEntry } from "../types";
import { getEdgeColor } from "../utils";
import { BorderPolyline } from "./BorderPolyline";
import { EdgeWithTooltip } from "./EdgeWithTooltip";

interface NetworkEdgeProps {
  entry: ResultEntry;
  index: number;
  highlightedUuid: string | null;
  onHover: (uuid: string | null) => void;
  onHoverOut: () => void;
}

export function NetworkEdge({
  entry,
  index,
  highlightedUuid,
  onHover,
  onHoverOut,
}: NetworkEdgeProps) {
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
      key={`edge-group-${index}-${isHighlighted ? "highlighted" : "normal"}`}
    >
      {/* Border effect - render a darker, thicker line underneath */}
      <BorderPolyline positions={positions} isHighlighted={isHighlighted} />
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
        onHover={onHover}
        onHoverOut={onHoverOut}
      />
    </Fragment>
  );
}
