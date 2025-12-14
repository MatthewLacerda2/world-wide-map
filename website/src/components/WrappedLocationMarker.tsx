import { useEffect, useState } from "react";
import { useMap } from "react-leaflet";
import type { GeoLocation } from "../types";
import { LocationMarker } from "./LocationMarker";

interface WrappedLocationMarkerProps {
  geo: GeoLocation;
  index: number;
}

export function WrappedLocationMarker({
  geo,
  index,
}: WrappedLocationMarkerProps) {
  const map = useMap();
  const [wrappedPositions, setWrappedPositions] = useState<GeoLocation[]>([
    geo,
  ]);

  useEffect(() => {
    const updateWrappedPositions = () => {
      const bounds = map.getBounds();
      const west = bounds.getWest();
      const east = bounds.getEast();
      const lng = geo.longitude;
      const boundsWidth = east - west;

      const positions: GeoLocation[] = [geo];

      // Calculate threshold based on zoom level (smaller threshold at higher zoom)
      const threshold = Math.min(boundsWidth * 0.2, 30);

      // If marker is near the left edge, add a copy on the right side
      if (lng < west + threshold) {
        positions.push({
          ...geo,
          longitude: lng + 360,
        });
      }

      // If marker is near the right edge, add a copy on the left side
      if (lng > east - threshold) {
        positions.push({
          ...geo,
          longitude: lng - 360,
        });
      }

      setWrappedPositions(positions);
    };

    updateWrappedPositions();
    map.on("move", updateWrappedPositions);
    map.on("zoom", updateWrappedPositions);
    map.on("viewreset", updateWrappedPositions);

    return () => {
      map.off("move", updateWrappedPositions);
      map.off("zoom", updateWrappedPositions);
      map.off("viewreset", updateWrappedPositions);
    };
  }, [map, geo]);

  return (
    <>
      {wrappedPositions.map((wrappedGeo, i) => (
        <LocationMarker key={`${index}-${i}`} geo={wrappedGeo} />
      ))}
    </>
  );
}
