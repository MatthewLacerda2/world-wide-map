import L from "leaflet";
import { useEffect, useRef } from "react";
import { Polyline } from "react-leaflet";

interface BorderPolylineProps {
  positions: [[number, number], [number, number]];
  isHighlighted: boolean;
}

export function BorderPolyline({
  positions,
  isHighlighted,
}: BorderPolylineProps) {
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
