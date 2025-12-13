import { useEffect, useState } from "react";
import type { ResultsData } from "../types";

// GitHub Gist raw URL for results.json
const RESULTS_JSON_URL =
  "https://gist.githubusercontent.com/MatthewLacerda2/e087768cee30773ac20c7eec2e16fdfb/raw/results.json";

export function useResultsData() {
  const [data, setData] = useState<ResultsData>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(RESULTS_JSON_URL);

        if (!response.ok) {
          throw new Error(`Failed to fetch data: ${response.statusText}`);
        }

        const jsonData = await response.json();
        setData(jsonData as ResultsData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load data");
        console.error("Error fetching results.json:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return { data, loading, error };
}
