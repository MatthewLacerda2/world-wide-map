import L from "leaflet";
import { useEffect } from "react";
import { useMap } from "react-leaflet";
import type { ResultEntry, ResultsData } from "../types";

interface MapBoundsControllerProps {
  data: ResultsData;
}

export function MapBoundsController({ data }: MapBoundsControllerProps) {
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
