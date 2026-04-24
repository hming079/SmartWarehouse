import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Card from "../components/ui/Card";
import { api } from "../api";

const RANGE_OPTIONS = [
  { value: "24h", label: "24 hours" },
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
];

const METRIC_OPTIONS = [
  { value: "temperature", label: "Temperature" },
  { value: "humidity", label: "Humidity" },
];

function formatMetricValue(value, metric) {
  if (value === null || value === undefined) return "--";
  const suffix = metric === "humidity" ? "%" : "°C";
  return `${Number(value).toFixed(2)} ${suffix}`;
}

function formatTimestamp(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString();
}

function getSeverityColor(severity) {
  if (severity === "critical") return "bg-red-600";
  if (severity === "high") return "bg-orange-500";
  if (severity === "medium") return "bg-yellow-500";
  return "bg-emerald-500";
}

function TimeseriesChart({ points, metric }) {
  const width = 720;
  const height = 240;
  const padding = 24;

  const chart = useMemo(() => {
    if (!Array.isArray(points) || points.length === 0) {
      return { path: "", circles: [], min: 0, max: 0 };
    }

    const values = points.map((point) => Number(point.value || 0));
    const min = Math.min(...values);
    const max = Math.max(...values);
    const diff = max - min || 1;

    const xStep = points.length > 1 ? (width - padding * 2) / (points.length - 1) : 0;

    const circles = points.map((point, index) => {
      const x = padding + index * xStep;
      const y = height - padding - ((Number(point.value || 0) - min) / diff) * (height - padding * 2);
      return { ...point, x, y };
    });

    const path = circles
      .map((point, index) => `${index === 0 ? "M" : "L"}${point.x},${point.y}`)
      .join(" ");

    return { path, circles, min, max };
  }, [points]);

  const unit = metric === "humidity" ? "%" : "°C";

  if (!points?.length) {
    return <div className="rounded-xl bg-white p-6 text-sm text-gray-500">No data in selected range.</div>;
  }

  return (
    <div className="overflow-x-auto rounded-xl bg-white p-4">
      <svg viewBox={`0 0 ${width} ${height}`} className="min-w-[520px]">
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#d1d5db" />
        <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="#d1d5db" />
        <path d={chart.path} fill="none" stroke="#6c4fd3" strokeWidth="3" strokeLinecap="round" />
        {chart.circles.map((point, index) => (
          <circle key={index} cx={point.x} cy={point.y} r="3.5" fill="#6c4fd3">
            <title>{`${formatTimestamp(point.timestamp)}: ${Number(point.value || 0).toFixed(2)} ${unit}`}</title>
          </circle>
        ))}
        <text x={padding + 4} y={padding + 12} fill="#6b7280" fontSize="12">{`${chart.max.toFixed(2)} ${unit}`}</text>
        <text x={padding + 4} y={height - padding - 6} fill="#6b7280" fontSize="12">{`${chart.min.toFixed(2)} ${unit}`}</text>
      </svg>
    </div>
  );
}

const Dashboard = () => {
  const [searchParams] = useSearchParams();
  const roomId = Number(searchParams.get("roomId")) || null;

  const [range, setRange] = useState("24h");
  const [metric, setMetric] = useState("temperature");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [overview, setOverview] = useState(null);
  const [timeseries, setTimeseries] = useState([]);
  const [deviceStatus, setDeviceStatus] = useState({ summary: {}, items: [] });
  const [alertsSummary, setAlertsSummary] = useState({ bySeverity: {}, total: 0 });

  useEffect(() => {
    let canceled = false;

    async function loadDashboard() {
      setLoading(true);
      setError("");
      try {
        const [overviewRes, timeseriesRes, statusRes, alertsRes] = await Promise.all([
          api.getDashboardOverview(),
          api.getDashboardTimeseries({ roomId, metric, range }),
          api.getDashboardDeviceStatus({ roomId }),
          api.getDashboardAlertsSummary({ range }),
        ]);

        if (canceled) return;

        setOverview(overviewRes?.data || null);
        setTimeseries(timeseriesRes?.data?.points || []);
        setDeviceStatus(statusRes?.data || { summary: {}, items: [] });
        setAlertsSummary(alertsRes?.data || { bySeverity: {}, total: 0 });
      } catch (loadError) {
        if (!canceled) {
          setError(loadError.message || "Failed to load dashboard data");
        }
      } finally {
        if (!canceled) {
          setLoading(false);
        }
      }
    }

    loadDashboard();
    return () => {
      canceled = true;
    };
  }, [roomId, metric, range]);

  const cards = overview?.cards || {};
  const latest = overview?.latest || {};

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3 rounded-2xl bg-white p-5 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1d1645]">Dashboard</h1>
          <p className="text-sm text-gray-500">Realtime warehouse telemetry and status overview.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm font-medium text-gray-600">
            Metric
            <select
              className="ml-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
              value={metric}
              onChange={(event) => setMetric(event.target.value)}
            >
              {METRIC_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm font-medium text-gray-600">
            Range
            <select
              className="ml-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
              value={range}
              onChange={(event) => setRange(event.target.value)}
            >
              {RANGE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {error ? <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div> : null}
      {loading ? <div className="text-sm text-gray-500">Loading dashboard data...</div> : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="bg-[#ece6f8] p-5">
          <p className="text-xs uppercase tracking-wide text-[#5a4aa2]">Active Devices</p>
          <p className="mt-2 text-3xl font-bold text-[#1d1645]">{Number(cards.activeDevices || 0)}</p>
        </Card>
        <Card className="bg-[#ece6f8] p-5">
          <p className="text-xs uppercase tracking-wide text-[#5a4aa2]">Total Devices</p>
          <p className="mt-2 text-3xl font-bold text-[#1d1645]">{Number(cards.totalDevices || 0)}</p>
        </Card>
        <Card className="bg-[#ece6f8] p-5">
          <p className="text-xs uppercase tracking-wide text-[#5a4aa2]">Open Alerts</p>
          <p className="mt-2 text-3xl font-bold text-[#1d1645]">{Number(cards.openAlerts || 0)}</p>
        </Card>
        <Card className="bg-[#ece6f8] p-5">
          <p className="text-xs uppercase tracking-wide text-[#5a4aa2]">Rooms Online</p>
          <p className="mt-2 text-3xl font-bold text-[#1d1645]">{Number(cards.roomsOnline || 0)}</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Card className="space-y-4 bg-[#f7f5fc] p-5 xl:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[#1d1645]">{metric === "humidity" ? "Humidity Trend" : "Temperature Trend"}</h2>
            <span className="text-xs text-gray-500">{`Room: ${roomId || "All"}`}</span>
          </div>
          <TimeseriesChart points={timeseries} metric={metric} />
        </Card>

        <div className="space-y-5">
          <Card className="bg-[#ece6f8] p-5">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-[#5a4aa2]">Latest Readings</h3>
            <div className="mt-3 space-y-2">
              <p className="text-sm text-gray-600">Temperature</p>
              <p className="text-xl font-semibold text-[#1d1645]">{formatMetricValue(latest.temperature, "temperature")}</p>
              <p className="text-sm text-gray-600">Humidity</p>
              <p className="text-xl font-semibold text-[#1d1645]">{formatMetricValue(latest.humidity, "humidity")}</p>
            </div>
          </Card>

          <Card className="bg-[#fef7f0] p-5">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-[#7a4b17]">Alerts by Severity</h3>
            <div className="mt-3 space-y-2">
              {["critical", "high", "medium", "low"].map((severity) => (
                <div key={severity} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${getSeverityColor(severity)}`} />
                    <span className="text-sm capitalize text-gray-700">{severity}</span>
                  </div>
                  <span className="text-sm font-semibold text-[#1d1645]">
                    {Number(alertsSummary?.bySeverity?.[severity] || 0)}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-4 border-t border-orange-100 pt-3 text-sm font-semibold text-[#7a4b17]">
              Total: {Number(alertsSummary?.total || 0)}
            </div>
          </Card>
        </div>
      </div>

      <Card className="bg-white p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[#1d1645]">Device Status</h2>
          <p className="text-sm text-gray-500">
            {`Online ${Number(deviceStatus?.summary?.online || 0)} / ${Number(deviceStatus?.summary?.total || 0)}`}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-gray-500">
                {/* <th className="px-2 py-2">Name</th> */}
                <th className="px-2 py-2">Device</th>
                <th className="px-2 py-2">Status</th>
                <th className="px-2 py-2">Room</th>
                <th className="px-2 py-2">Updated</th>
              </tr>
            </thead>
            <tbody>
              {(deviceStatus?.items || []).slice(0, 8).map((item) => (
                <tr key={item.id} className="border-b border-gray-50 last:border-b-0">
                  {/* <td className="px-2 py-2 font-medium text-[#1d1645]">{item.name || "Unknown"}</td> */}
                  <td className="px-2 py-2 text-gray-700">{item.type || "--"}</td>
                  <td className="px-2 py-2">
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                        String(item.status).toUpperCase() === "ON"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {String(item.status || "OFF").toUpperCase()}
                    </span>
                  </td>
                  <td className="px-2 py-2 text-gray-700">{item.room_name || "Unassigned"}</td>
                  <td className="px-2 py-2 text-gray-500">{formatTimestamp(item.last_update_time) || "--"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </section>
  );
};

export default Dashboard;

