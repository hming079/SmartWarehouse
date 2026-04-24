import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../api";

const formatDateTime = (value) => {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleString("vi-VN");
};

const AuditLogs = () => {
  const [searchParams] = useSearchParams();
  const roomId = Number(searchParams.get("roomId")) || null;

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const loadAuditLogs = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await api.getAuditLogs({
          page: 1,
          pageSize: 50,
          roomId: roomId || undefined,
        });

        if (cancelled) return;
        setItems(response?.data || []);
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Khong the tai audit logs");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadAuditLogs();

    return () => {
      cancelled = true;
    };
  }, [roomId]);

  return (
    <section className="space-y-5">
      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-bold text-[#1d1645]">Audit logs</h1>
        <p className="mt-1 text-sm text-gray-500">
          {roomId ? `Room ${roomId}` : "All rooms"}
        </p>
      </div>

      <div className="rounded-2xl bg-white p-4 shadow-sm">
        {loading ? <p className="text-sm text-gray-500">Loading audit logs...</p> : null}
        {!loading && error ? <p className="text-sm text-red-600">{error}</p> : null}
        {!loading && !error && items.length === 0 ? <p className="text-sm text-gray-500">No audit logs found.</p> : null}

        {!loading && !error && items.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-600">
                  <th className="px-2 py-2">Time</th>
                  <th className="px-2 py-2">Actor</th>
                  <th className="px-2 py-2">Action</th>
                  <th className="px-2 py-2">Room</th>
                  <th className="px-2 py-2">Sensor</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b border-gray-100 last:border-b-0">
                    <td className="px-2 py-2 text-gray-700">{formatDateTime(item.timestamp)}</td>
                    <td className="px-2 py-2 text-gray-700">{item.actor || "System"}</td>
                    <td className="px-2 py-2 font-medium text-[#1d1645]">{item.action || "--"}</td>
                    <td className="px-2 py-2 text-gray-700">{item.room_name || item.room_id || "--"}</td>
                    <td className="px-2 py-2 text-gray-700">{item.sensor_name || item.sensor_id || "--"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </section>
  );
};

export default AuditLogs;
