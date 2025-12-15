import { useEffect, useState } from "react";
import { useMap } from "react-leaflet";
import type { ResultEntry } from "../types";
import { NetworkEdge } from "./NetworkEdge";

interface WrappedNetworkEdgeProps {
  entry: ResultEntry;
  index: number;
}

export function WrappedNetworkEdge({
  entry,
  index,
}: WrappedNetworkEdgeProps) {
  const map = useMap();
  const [wrappedEntries, setWrappedEntries] = useState<ResultEntry[]>([entry]);

  useEffect(() => {
    if (!entry.origin_geo || !entry.destination_geo) {
      return;
    }

    const updateWrappedEntries = () => {
      const bounds = map.getBounds();
      const west = bounds.getWest();
      const east = bounds.getEast();
      const originLng = entry.origin_geo!.longitude;
      const destLng = entry.destination_geo!.longitude;
      const boundsWidth = east - west;

      const entries: ResultEntry[] = [entry];

      // Calculate threshold based on zoom level
      const threshold = Math.min(boundsWidth * 0.2, 30);

      // Check if we need to wrap the edge
      const needsLeftWrap =
        originLng < west + threshold || destLng < west + threshold;
      const needsRightWrap =
        originLng > east - threshold || destLng > east - threshold;

      if (needsLeftWrap) {
        entries.push({
          ...entry,
          origin_geo: entry.origin_geo
            ? { ...entry.origin_geo, longitude: originLng + 360 }
            : undefined,
          destination_geo: entry.destination_geo
            ? { ...entry.destination_geo, longitude: destLng + 360 }
            : undefined,
        });
      }

      if (needsRightWrap) {
        entries.push({
          ...entry,
          origin_geo: entry.origin_geo
            ? { ...entry.origin_geo, longitude: originLng - 360 }
            : undefined,
          destination_geo: entry.destination_geo
            ? { ...entry.destination_geo, longitude: destLng - 360 }
            : undefined,
        });
      }

      setWrappedEntries(entries);
    };

    updateWrappedEntries();
    map.on("move", updateWrappedEntries);
    map.on("zoom", updateWrappedEntries);
    map.on("viewreset", updateWrappedEntries);

    return () => {
      map.off("move", updateWrappedEntries);
      map.off("zoom", updateWrappedEntries);
      map.off("viewreset", updateWrappedEntries);
    };
  }, [map, entry]);

  return (
    <>
      {wrappedEntries.map((wrappedEntry, i) => (
        <NetworkEdge
          key={`${index}-${i}`}
          entry={wrappedEntry}
          index={index * 1000 + i}
        />
      ))}
    </>
  );
}
