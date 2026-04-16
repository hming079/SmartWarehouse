import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Modal from "../components/ui/Modal";
import { api } from "../api";

const DAY_OPTIONS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
const ACTION_OPTIONS = [
  { value: "POWER_ON", label: "Power On" },
  { value: "POWER_OFF", label: "Power Off" },
  { value: "LOW_POWER", label: "Low Power" },
];

const initialForm = {
  name: "",
  start_time: "08:00",
  end_time: "18:00",
  days: ["MON", "TUE", "WED", "THU", "FRI"],
  action: "POWER_ON",
};

function parseDays(value) {
  if (!value) return [];
  return String(value)
    .split(",")
    .map((item) => item.trim().toUpperCase())
    .filter(Boolean);
}

function toTimeInput(value) {
  if (!value) return "";
  const normalized = String(value);
  return normalized.length >= 5 ? normalized.slice(0, 5) : normalized;
}

const Schedules = () => {
  const [searchParams] = useSearchParams();
  const roomId = Number(searchParams.get("roomId")) || null;

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState(initialForm);

  const activeQuery = useMemo(() => {
    if (activeFilter === "active") return true;
    if (activeFilter === "inactive") return false;
    return undefined;
  }, [activeFilter]);

  const loadSchedules = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await api.getSchedules({
        roomId: roomId || undefined,
        active: activeQuery,
      });
      setItems(response.data || []);
    } catch (err) {
      setError(err.message || "Failed to load schedules");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSchedules();
  }, [roomId, activeQuery]);

  const openCreateModal = () => {
    setEditingId(null);
    setForm(initialForm);
    setFormError("");
    setIsModalOpen(true);
  };

  const openEditModal = (item) => {
    setEditingId(item.id);
    setForm({
      name: item.name || "",
      start_time: toTimeInput(item.start_time),
      end_time: toTimeInput(item.end_time),
      days: parseDays(item.days_of_week),
      action: item.action || "POWER_ON",
    });
    setFormError("");
    setIsModalOpen(true);
  };

  const handleDayToggle = (day) => {
    setForm((prev) => {
      const hasDay = prev.days.includes(day);
      return {
        ...prev,
        days: hasDay ? prev.days.filter((d) => d !== day) : [...prev.days, day],
      };
    });
  };

  const validateForm = () => {
    const name = String(form.name || "").trim();
    if (!name) return "Name is required";
    if (!form.start_time) return "Start time is required";
    if (!form.end_time) return "End time is required";
    if (!Array.isArray(form.days) || form.days.length === 0) {
      return "Select at least one day";
    }
    if (!form.action) return "Action is required";
    return "";
  };

  const buildPayload = () => ({
    name: String(form.name).trim(),
    start_time: form.start_time,
    end_time: form.end_time,
    days_of_week: form.days.join(","),
    action: form.action,
  });

  const handleSubmit = async (event) => {
    event.preventDefault();
    const validationError = validateForm();
    if (validationError) {
      setFormError(validationError);
      return;
    }

    try {
      setSubmitting(true);
      setFormError("");
      const payload = buildPayload();

      if (editingId) {
        await api.updateSchedule(editingId, payload);
      } else {
        await api.createSchedule(payload);
      }

      setIsModalOpen(false);
      await loadSchedules();
    } catch (err) {
      setFormError(err.message || "Failed to save schedule");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.deleteSchedule(id);
      await loadSchedules();
    } catch (err) {
      alert(err.message || "Failed to delete schedule");
    }
  };

  const handleToggle = async (id) => {
    try {
      await api.toggleSchedule(id);
      await loadSchedules();
    } catch (err) {
      alert(err.message || "Failed to toggle schedule");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-2xl bg-white p-6 shadow-lg lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#24124d]">Schedules</h1>
          <p className="mt-1 text-sm text-[#5a4f7a]">
            Configure recurring automation schedules for your devices.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value)}
            className="rounded-xl border border-[#d6cdee] bg-white px-3 py-2 text-sm font-medium text-[#24124d]"
          >
            <option value="all">All schedules</option>
            <option value="active">Active only</option>
            <option value="inactive">Inactive only</option>
          </select>

          <button
            onClick={openCreateModal}
            className="rounded-xl bg-gradient-to-r from-[#7c3aed] to-[#a855f7] px-4 py-2 text-sm font-semibold text-white shadow transition hover:brightness-110"
          >
            + Add schedule
          </button>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-4 shadow-lg">
        {loading && <p className="text-sm text-gray-500">Loading schedules...</p>}
        {!loading && error && <p className="text-sm text-red-600">{error}</p>}
        {!loading && !error && items.length === 0 && (
          <p className="text-sm text-gray-500">No schedules found.</p>
        )}

        {!loading && !error && items.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-[#1d1645]">
              <thead>
                <tr className="border-b border-[#ece6f8] text-left">
                  <th className="px-3 py-3 font-semibold">Name</th>
                  <th className="px-3 py-3 font-semibold">Time Range</th>
                  <th className="px-3 py-3 font-semibold">Days</th>
                  <th className="px-3 py-3 font-semibold">Action</th>
                  <th className="px-3 py-3 font-semibold">Status</th>
                  <th className="px-3 py-3 font-semibold">Operations</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b border-[#f4effc] last:border-b-0">
                    <td className="px-3 py-3 font-medium">{item.name}</td>
                    <td className="px-3 py-3">
                      {toTimeInput(item.start_time)} - {toTimeInput(item.end_time)}
                    </td>
                    <td className="px-3 py-3">{item.days_of_week || "-"}</td>
                    <td className="px-3 py-3">{item.action}</td>
                    <td className="px-3 py-3">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-semibold ${
                          item.is_active
                            ? "bg-green-100 text-green-700"
                            : "bg-rose-100 text-rose-700"
                        }`}
                      >
                        {item.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => openEditModal(item)}
                          className="rounded-lg bg-[#ece6f8] px-3 py-1.5 text-xs font-semibold text-[#1d1645] transition hover:bg-[#ddd0f4]"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleToggle(item.id)}
                          className="rounded-lg bg-[#d6f3e6] px-3 py-1.5 text-xs font-semibold text-[#14623e] transition hover:bg-[#c4ebd9]"
                        >
                          Toggle
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="rounded-lg bg-[#ffd9d9] px-3 py-1.5 text-xs font-semibold text-[#8a1f1f] transition hover:bg-[#ffc3c3]"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-[#24124d]">
              {editingId ? "Update schedule" : "Create schedule"}
            </h2>
          </div>

          {formError && (
            <div className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm font-medium text-[#2f2651] md:col-span-2">
              Name
              <input
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                className="rounded-xl border border-[#d6cdee] px-3 py-2"
                placeholder="Night cooling"
              />
            </label>

            <label className="flex flex-col gap-1 text-sm font-medium text-[#2f2651]">
              Start time
              <input
                type="time"
                value={form.start_time}
                onChange={(e) => setForm((prev) => ({ ...prev, start_time: e.target.value }))}
                className="rounded-xl border border-[#d6cdee] px-3 py-2"
              />
            </label>

            <label className="flex flex-col gap-1 text-sm font-medium text-[#2f2651]">
              End time
              <input
                type="time"
                value={form.end_time}
                onChange={(e) => setForm((prev) => ({ ...prev, end_time: e.target.value }))}
                className="rounded-xl border border-[#d6cdee] px-3 py-2"
              />
            </label>

            <label className="flex flex-col gap-1 text-sm font-medium text-[#2f2651] md:col-span-2">
              Action
              <select
                value={form.action}
                onChange={(e) => setForm((prev) => ({ ...prev, action: e.target.value }))}
                className="rounded-xl border border-[#d6cdee] bg-white px-3 py-2"
              >
                {ACTION_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-[#2f2651]">Days of week</p>
            <div className="flex flex-wrap gap-2">
              {DAY_OPTIONS.map((day) => {
                const selected = form.days.includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => handleDayToggle(day)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                      selected
                        ? "bg-[#6c4fd3] text-white"
                        : "bg-[#ece6f8] text-[#1d1645] hover:bg-[#ddd0f4]"
                    }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="rounded-xl bg-[#efebf7] px-4 py-2 text-sm font-semibold text-[#3d2f64]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-[#6c4fd3] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#5d41c2] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {submitting ? "Saving..." : editingId ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Schedules;
