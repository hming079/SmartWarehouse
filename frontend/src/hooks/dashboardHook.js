import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";

const API_PORT = process.env.REACT_APP_API_PORT || "5001";
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || `http://localhost:${API_PORT}`;

export function useDashboardData() {
  const [searchParams] = useSearchParams();
  const roomIdParam = searchParams.get("roomId");

  const [overview, setOverview] = useState(null);
  const [temperatureTimeseries, setTemperatureTimeseries] = useState([]);
  const [powerTimeseries, setPowerTimeseries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;
    
    async function fetchData() {
      setLoading(true);
      setError("");

      try {
        const roomQuery = roomIdParam ? `?roomId=${roomIdParam}` : "";
        
        // Fetch Overview
        const overviewRes = await fetch(`${API_BASE_URL}/api/dashboard/overview${roomQuery}`);
        const overviewJson = await overviewRes.json();
        
        // Fetch Temperature Timeseries
        const tempRes = await fetch(`${API_BASE_URL}/api/dashboard/timeseries${roomQuery}${roomIdParam ? '&' : '?'}metric=temperature&range=24h`);
        const tempJson = await tempRes.json();

        // Fetch Power Timeseries
        const powerRes = await fetch(`${API_BASE_URL}/api/dashboard/timeseries${roomQuery}${roomIdParam ? '&' : '?'}metric=power&range=24h`);
        const powerJson = await powerRes.json();

        if (!isMounted) return;

        if (overviewJson.ok) {
          setOverview(overviewJson.data);
        } else {
          setError(overviewJson.error || "Cannot fetch overview");
        }

        if (tempJson.ok) {
          setTemperatureTimeseries(tempJson.data.points);
        }

        if (powerJson.ok) {
          setPowerTimeseries(powerJson.data.points);
        }

      } catch (err) {
        if (isMounted) setError(err.message);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [roomIdParam]);

  return {
    overview,
    temperatureTimeseries,
    powerTimeseries,
    loading,
    error,
  };
}
