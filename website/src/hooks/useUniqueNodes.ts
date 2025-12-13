import { useMemo } from "react";
import type { GeoLocation, ResultsData } from "../types";

export function useUniqueNodes(data: ResultsData): Map<string, GeoLocation> {
  return useMemo(() => {
    const nodes = new Map<string, GeoLocation>();

    data.forEach((entry) => {
      if (entry.origin_geo) {
        const key = `${entry.origin_geo.latitude},${entry.origin_geo.longitude}`;
        if (!nodes.has(key)) {
          nodes.set(key, entry.origin_geo);
        }
      }
      if (entry.destination_geo) {
        const key = `${entry.destination_geo.latitude},${entry.destination_geo.longitude}`;
        if (!nodes.has(key)) {
          nodes.set(key, entry.destination_geo);
        }
      }
    });

    // Debug: log unique nodes
    console.log(
      `Found ${nodes.size} unique nodes:`,
      Array.from(nodes.values()).map((g) => `${g.city}, ${g.country}`)
    );

    return nodes;
  }, [data]);
}
