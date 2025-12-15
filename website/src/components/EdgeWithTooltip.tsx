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
  distanceDisplay: string;
}

export function EdgeWithTooltip({
  positions,
  color,
  weight,
  opacity,
  originDisplay,
  destinationDisplay,
  pingDisplay,
  distanceDisplay,
}: EdgeWithTooltipProps) {
  const [tooltipPosition, setTooltipPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [isHovering, setIsHovering] = useState(false);
  const polylineRef = useRef<L.Polyline>(null);
  const map = useMap();

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
          <EdgeTooltip
            position={tooltipPosition}
            originDisplay={originDisplay}
            destinationDisplay={destinationDisplay}
            pingDisplay={pingDisplay}
            distanceDisplay={distanceDisplay}
          />,
          mapContainer
        )}
    </>
  );
}
