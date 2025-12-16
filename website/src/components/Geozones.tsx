import type {
  Feature,
  FeatureCollection,
  GeoJsonProperties,
  Geometry,
} from "geojson";
import { useEffect, useState } from "react";
import { Polygon } from "react-leaflet";

interface GeozonesProps {
  show: boolean;
}

function normalizeLongitude(lon: number): number {
  // Normalize longitude to -180 to 180 range
  while (lon < -180) lon += 360;
  while (lon > 180) lon -= 360;
  return lon;
}

function convertCoordinates(coords: number[][]): [number, number][] {
  return coords.map(([lon, lat]) => [lat, normalizeLongitude(lon)]);
}

export function Geozones({ show }: GeozonesProps) {
  const [geozonesData, setGeozonesData] = useState<FeatureCollection | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchGeozones = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch("/geozones.json");

        if (!response.ok) {
          throw new Error(`Failed to fetch geozones: ${response.statusText}`);
        }

        const jsonData = await response.json();
        setGeozonesData(jsonData as FeatureCollection);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load geozones"
        );
        console.error("Error fetching geozones.json:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchGeozones();
  }, []);

  if (!show || loading || error || !geozonesData) {
    return null;
  }

  return (
    <>
      {geozonesData.features.map(
        (feature: Feature<Geometry, GeoJsonProperties>, index) => {
          if (feature.geometry.type !== "Polygon") {
            return null;
          }

          const positions = convertCoordinates(feature.geometry.coordinates[0]);

          return (
            <Polygon
              key={feature.properties?.id || index}
              positions={positions}
              pathOptions={{
                fillColor: "#9c27b0",
                fillOpacity: 0.2,
                color: "#9c27b0",
                weight: 2,
                opacity: 0.6,
                interactive: false,
              }}
            />
          );
        }
      )}
    </>
  );
}
