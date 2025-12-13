import L from "leaflet";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Polyline, useMap } from "react-leaflet";
import { EdgeTooltip } from "./EdgeTooltip";

interface EdgeWithTooltipProps {
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
}

export function EdgeWithTooltip({
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
}: EdgeWithTooltipProps) {
  const [tooltipPosition, setTooltipPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [isHovering, setIsHovering] = useState(false);
  const polylineRef = useRef<L.Polyline>(null);
  const map = useMap();

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
          <EdgeTooltip
            position={tooltipPosition}
            originDisplay={originDisplay}
            destinationDisplay={destinationDisplay}
            pingDisplay={pingDisplay}
          />,
          mapContainer
        )}
    </>
  );
}
