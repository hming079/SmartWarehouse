import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CalendarClock, Plus, Trash2, Edit, ArrowRight } from "lucide-react";
import Modal from "../components/ui/Modal";
import { api } from "../api";

const LOCATION_ID = 1;

const DAY_OPTIONS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
const ACTION_OPTIONS = [
  { value: "POWER_ON", label: "Power On" },
  { value: "POWER_OFF", label: "Power Off" },
  { value: "LOW_POWER", label: "Low Power" },
];

function getActionLabel(value) {
  const found = ACTION_OPTIONS.find((item) => item.value === value);
  return found?.label || value || "--";
}

const initialForm = {
  name: "",
  start_time: "08:00",
  end_time: "18:00",
  days: ["MON", "TUE", "WED", "THU", "FRI"],
  device_ids: [],
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

function parseDeviceIds(value) {
  if (!value) return [];
  return String(value)
    .split(",")
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isInteger(item) && item > 0);
}

const Schedules = () => {
  const [searchParams] = useSearchParams();
  const urlRoomId = Number(searchParams.get("roomId")) || null;

  const [items, setItems] = useState([]);
  const [deviceOptions, setDeviceOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");

  const [zones, setZones] = useState([]);
  const [floors, setFloors] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [selectedZone, setSelectedZone] = useState(null);
  const [selectedFloor, setSelectedFloor] = useState(null);
  const [selectedRoom, setSelectedRoom] = useState(urlRoomId);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState(initialForm);

  const roomId = selectedRoom || urlRoomId;

  const activeQuery = useMemo(() => {
    if (activeFilter === "active") return true;
    if (activeFilter === "inactive") return false;
    return undefined;
  }, [activeFilter]);

  // Fetch zones on mount
  useEffect(() => {
    const loadZones = async () => {
      try {
        const res = await api.getZones(LOCATION_ID);
        setZones(res.data || []);
      } catch (err) {
        console.error("Failed to load zones:", err.message);
      }
    };
    loadZones();
  }, []);

  // Fetch floors when zone changes
  useEffect(() => {
    const loadFloors = async () => {
      if (!selectedZone) {
        setFloors([]);
        return;
      }
      try {
        const res = await api.getFloors(selectedZone);
        setFloors(res.data || []);
      } catch (err) {
        console.error("Failed to load floors:", err.message);
        setFloors([]);
      }
    };
    loadFloors();
  }, [selectedZone]);

  // Fetch rooms when floor changes
  useEffect(() => {
    const loadRooms = async () => {
      if (!selectedFloor) {
        setRooms([]);
        return;
      }
      try {
        const res = await api.getRooms(selectedFloor);
        setRooms(res.data || []);
      } catch (err) {
        console.error("Failed to load rooms:", err.message);
        setRooms([]);
      }
    };
    loadRooms();
  }, [selectedFloor]);

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

  const loadDeviceOptions = async () => {
    try {
      const response = await api.getScheduleDevices({
        roomId: roomId || undefined,
      });
      setDeviceOptions(response.data || []);
    } catch (_) {
      setDeviceOptions([]);
    }
  };

  useEffect(() => {
    loadSchedules();
    loadDeviceOptions();
  }, [roomId, activeQuery]);

  const openCreateModal = () => {
    setEditingId(null);
    setForm(initialForm);
    setFormError("");
    setIsModalOpen(true);
  };

  const openEditModal = async (item) => {
    setEditingId(item.id);
    setForm({
      name: item.name || "",
      start_time: toTimeInput(item.start_time),
      end_time: toTimeInput(item.end_time),
      days: parseDays(item.days_of_week),
      device_ids: parseDeviceIds(item.device_ids),
      action: item.action || "POWER_ON",
    });
    setFormError("");
    
    // Pre-populate room selection if schedule has room info
    if (item.room_id) {
      const roomNum = item.room_id;
      setSelectedRoom(roomNum);
      
      // Find and load the zone and floor for this room
      if (zones.length > 0) {
        for (const zone of zones) {
          try {
            const floorsRes = await api.getFloors(zone.zone_id);
            const zoneFloors = floorsRes.data || [];
            
            for (const floor of zoneFloors) {
              const roomsRes = await api.getRooms(floor.floor_id);
              const floorRooms = roomsRes.data || [];
              
              if (floorRooms.find(r => r.room_id === roomNum)) {
                setSelectedZone(zone.zone_id);
                setSelectedFloor(floor.floor_id);
                setFloors(zoneFloors);
                setRooms(floorRooms);
                break;
              }
            }
          } catch (err) {
            console.error("Failed to load room hierarchy:", err);
          }
        }
      }
    }
    
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
    device_ids: form.device_ids,
    action: form.action,
    room_id: selectedRoom || undefined,
  });

  const handleDeviceToggle = (deviceId) => {
    setForm((prev) => {
      const selected = Array.isArray(prev.device_ids) ? prev.device_ids : [];
      const hasId = selected.includes(deviceId);
      return {
        ...prev,
        device_ids: hasId
          ? selected.filter((item) => item !== deviceId)
          : [...selected, deviceId],
      };
    });
  };

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
      // Reset room selection state for next use
      setSelectedZone(null);
      setSelectedFloor(null);
      setSelectedRoom(urlRoomId);
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
    <section className="min-h-[80vh] rounded-3xl bg-white/10 dark:bg-slate-900/50 backdrop-blur-md border border-white/20 text-slate-900 dark:text-white shadow-2xl p-6 relative overflow-hidden space-y-6">
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div className="absolute top-0 -left-20 w-72 h-72 rounded-full bg-indigo-500/30 blur-[100px]" />
        <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full bg-blue-500/20 blur-[100px]" />
      </div>

      <div className="relative space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="flex items-center gap-3 text-2xl font-bold text-slate-900 dark:text-white">
              <CalendarClock className="text-indigo-400" size={28} />
              Lịch trình
            </h1>
            <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
              Cấu hình lịch tự động định kỳ cho các thiết bị của bạn.
            </p>
          </div>

          <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center">
            <div className="flex flex-wrap items-center gap-2 md:flex-nowrap">
              <select
                value={selectedZone || ""}
                onChange={(e) => {
                  const zoneId = e.target.value ? Number(e.target.value) : null;
                  setSelectedZone(zoneId);
                  setSelectedFloor(null);
                  setSelectedRoom(null);
                }}
                className="rounded-xl border border-indigo-400/30 bg-white/10 px-3 py-2 text-sm font-medium text-slate-900 backdrop-blur dark:bg-slate-800/40 dark:text-white"
              >
                <option value="">All Areas</option>
                {zones.map((zone) => (
                  <option key={zone.zone_id} value={zone.zone_id}>
                    {zone.name}
                  </option>
                ))}
              </select>

              <select
                value={selectedFloor || ""}
                onChange={(e) => {
                  const floorId = e.target.value ? Number(e.target.value) : null;
                  setSelectedFloor(floorId);
                  setSelectedRoom(null);
                }}
                disabled={!selectedZone}
                className="rounded-xl border border-indigo-400/30 bg-white/10 px-3 py-2 text-sm font-medium text-slate-900 backdrop-blur disabled:opacity-50 dark:bg-slate-800/40 dark:text-white"
              >
                <option value="">All Floors</option>
                {floors.map((floor) => (
                  <option key={floor.floor_id} value={floor.floor_id}>
                    Floor {floor.floor_number}
                  </option>
                ))}
              </select>

              <select
                value={selectedRoom || ""}
                onChange={(e) => {
                  const roomNum = e.target.value ? Number(e.target.value) : null;
                  setSelectedRoom(roomNum);
                }}
                disabled={!selectedFloor}
                className="rounded-xl border border-indigo-400/30 bg-white/10 px-3 py-2 text-sm font-medium text-slate-900 backdrop-blur disabled:opacity-50 dark:bg-slate-800/40 dark:text-white"
              >
                <option value="">All Rooms</option>
                {rooms.map((room) => (
                  <option key={room.room_id} value={room.room_id}>
                    {room.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1 rounded-xl border border-indigo-400/30 bg-white/10 p-1 backdrop-blur dark:bg-slate-800/40">
              {[
                { key: "all", label: "All" },
                { key: "active", label: "Active" },
                { key: "inactive", label: "Inactive" },
              ].map((item) => (
                <button
                  key={item.key}
                  onClick={() => setActiveFilter(item.key)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                    activeFilter === item.key
                      ? "border border-indigo-400/40 bg-indigo-500/30 text-indigo-900 dark:text-indigo-200 shadow-sm"
                      : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <button
              onClick={openCreateModal}
              className="flex items-center gap-2 rounded-xl border border-emerald-400/30 bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 transition-all hover:brightness-110 hover:shadow-emerald-500/50"
            >
              <Plus size={16} /> Add schedule
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-indigo-400/30 bg-white/10 p-4 shadow-lg backdrop-blur dark:bg-slate-800/40 md:p-6">
          {loading && (
            <div className="flex justify-center p-10">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-indigo-400" />
            </div>
          )}

          {!loading && error && (
            <div className="rounded-xl border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-900 dark:text-rose-200">
              {error}
            </div>
          )}

          {!loading && !error && items.length === 0 && (
            <div className="p-10 text-center text-slate-400">
              <CalendarClock className="mx-auto mb-3 opacity-50" size={48} />
              <p>No schedules found.</p>
            </div>
          )}

          {!loading && !error && items.length > 0 && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="group relative overflow-hidden rounded-2xl border border-indigo-400/30 bg-white/10 p-5 shadow-lg backdrop-blur transition-all hover:border-indigo-400/50 hover:shadow-lg dark:bg-slate-800/40"
                >
                  <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-indigo-500/5 blur-[50px] transition-all group-hover:bg-indigo-500/10" />

                  <div className="relative z-10">
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-lg font-bold text-slate-900 dark:text-white">
                          {item.name || `Schedule #${item.id}`}
                        </h3>
                        <div className="mt-1 flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300">
                          <span className="flex items-center gap-1 rounded-md border border-indigo-400/30 bg-white/10 px-2 py-1 text-slate-700 dark:text-slate-200">
                            {toTimeInput(item.start_time)} <ArrowRight size={10} /> {toTimeInput(item.end_time)}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleToggle(item.id)}
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          item.is_active ? "bg-emerald-500" : "bg-slate-600"
                        }`}
                      >
                        <span
                          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            item.is_active ? "translate-x-5" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>

                    <div className="mb-4 space-y-2">
                      {item.room_name && (
                        <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-700 dark:text-slate-400">Room:</span>
                        <span className="font-medium text-slate-900 dark:text-white">{item.room_name}</span>
                        </div>
                      )}

                      <div className="flex flex-wrap gap-1">
                        {DAY_OPTIONS.map((day) => {
                          const isActive = item.days_of_week?.includes(day);
                          return (
                            <span
                              key={day}
                              className={`rounded border px-1.5 py-0.5 text-[10px] font-bold ${
                                isActive
                                  ? "border-indigo-400/40 bg-indigo-500/20 text-indigo-900 dark:text-indigo-200"
                                  : "border-slate-600 bg-slate-800 text-slate-700 dark:text-slate-400"
                              }`}
                            >
                              {day.charAt(0)}
                            </span>
                          );
                        })}
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-700 dark:text-slate-400">Action:</span>
                        <span
                          className={`rounded-md px-2 py-0.5 font-bold ${
                            item.action === "POWER_ON"
                              ? "bg-emerald-500/20 text-emerald-900 dark:text-emerald-300"
                              : item.action === "POWER_OFF"
                                ? "bg-rose-500/20 text-rose-900 dark:text-rose-300"
                                : "bg-amber-500/20 text-amber-900 dark:text-amber-300"
                          }`}
                        >
                          {getActionLabel(item.action)}
                        </span>
                      </div>

                      <div className="flex items-start justify-between text-xs">
                        <span className="mt-0.5 text-slate-700 dark:text-slate-400">Devices:</span>
                        <span className="max-w-[60%] truncate text-right font-medium text-slate-900 dark:text-white" title={item.device_names}>
                          {item.device_names || "No devices"}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 flex gap-2 border-t border-slate-700 pt-4">
                      <button
                        onClick={() => openEditModal(item)}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-indigo-400/30 bg-indigo-500/20 px-3 py-2 text-xs font-semibold text-indigo-900 dark:text-indigo-200 transition-all hover:bg-indigo-500/30"
                      >
                        <Edit size={14} /> Edit
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-rose-400/30 bg-rose-500/20 px-3 py-2 text-xs font-semibold text-rose-900 dark:text-rose-300 transition-all hover:bg-rose-500/30"
                      >
                        <Trash2 size={14} /> Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="flex items-center justify-between">
              <h2 className="bg-gradient-to-r from-indigo-500 to-indigo-600 bg-clip-text text-xl font-bold text-transparent">
                {editingId ? "Update schedule" : "Create schedule"}
              </h2>
            </div>

            {formError && (
              <div className="rounded-xl border border-rose-400/40 bg-rose-500/20 px-3 py-2 text-sm text-rose-900 dark:text-rose-200">
                {formError}
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <label className="flex flex-col gap-1 text-sm font-medium text-slate-900 dark:text-white md:col-span-2">
                Name
                <input
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="rounded-xl border border-indigo-400/30 bg-white/10 px-3 py-2 text-slate-900 backdrop-blur placeholder-slate-700 dark:bg-slate-800/40 dark:text-white dark:placeholder-slate-500"
                  placeholder="Night cooling"
                />
              </label>

              <label className="flex flex-col gap-1 text-sm font-medium text-slate-900 dark:text-white">
                Area (Khu vực)
                <select
                  value={selectedZone || ""}
                  onChange={(e) => {
                    const zoneId = e.target.value ? Number(e.target.value) : null;
                    setSelectedZone(zoneId);
                    setSelectedFloor(null);
                    setSelectedRoom(null);
                  }}
                  className="rounded-xl border border-indigo-400/30 bg-white/10 px-3 py-2 text-slate-900 backdrop-blur dark:bg-slate-800/40 dark:text-white"
                >
                  <option value="">Select Area</option>
                  {zones.map((zone) => (
                    <option key={zone.zone_id} value={zone.zone_id}>
                      {zone.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1 text-sm font-medium text-slate-900 dark:text-white">
                Floor (Tầng)
                <select
                  value={selectedFloor || ""}
                  onChange={(e) => {
                    const floorId = e.target.value ? Number(e.target.value) : null;
                    setSelectedFloor(floorId);
                    setSelectedRoom(null);
                  }}
                  disabled={!selectedZone}
                  className="rounded-xl border border-indigo-400/30 bg-white/10 px-3 py-2 text-slate-900 backdrop-blur disabled:opacity-50 dark:bg-slate-800/40 dark:text-white"
                >
                  <option value="">Select Floor</option>
                  {floors.map((floor) => (
                    <option key={floor.floor_id} value={floor.floor_id}>
                      Floor {floor.floor_number}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1 text-sm font-medium text-slate-900 dark:text-white">
                Room (Phòng)
                <select
                  value={selectedRoom || ""}
                  onChange={(e) => {
                    const roomNum = e.target.value ? Number(e.target.value) : null;
                    setSelectedRoom(roomNum);
                  }}
                  disabled={!selectedFloor}
                  className="rounded-xl border border-indigo-400/30 bg-white/10 px-3 py-2 text-slate-900 backdrop-blur disabled:opacity-50 dark:bg-slate-800/40 dark:text-white"
                >
                  <option value="">Select Room</option>
                  {rooms.map((room) => (
                    <option key={room.room_id} value={room.room_id}>
                      {room.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1 text-sm font-medium text-slate-900 dark:text-white">
                Start time
                <input
                  type="time"
                  value={form.start_time}
                  onChange={(e) => setForm((prev) => ({ ...prev, start_time: e.target.value }))}
                  className="rounded-xl border border-indigo-400/30 bg-white/10 px-3 py-2 text-slate-900 backdrop-blur dark:bg-slate-800/40 dark:text-white"
                />
              </label>

              <label className="flex flex-col gap-1 text-sm font-medium text-slate-900 dark:text-white">
                End time
                <input
                  type="time"
                  value={form.end_time}
                  onChange={(e) => setForm((prev) => ({ ...prev, end_time: e.target.value }))}
                  className="rounded-xl border border-indigo-400/30 bg-white/10 px-3 py-2 text-slate-900 backdrop-blur dark:bg-slate-800/40 dark:text-white"
                />
              </label>

              <label className="flex flex-col gap-1 text-sm font-medium text-slate-900 dark:text-white md:col-span-2">
                Action
                <select
                  value={form.action}
                  onChange={(e) => setForm((prev) => ({ ...prev, action: e.target.value }))}
                  className="rounded-xl border border-indigo-400/30 bg-white/10 px-3 py-2 text-slate-900 backdrop-blur dark:bg-slate-800/40 dark:text-white"
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
              <p className="text-sm font-medium text-slate-900 dark:text-white">Days of week</p>
              <div className="flex flex-wrap gap-2">
                {DAY_OPTIONS.map((day) => {
                  const selected = form.days.includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => handleDayToggle(day)}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                        selected
                          ? "border-indigo-400/40 bg-indigo-500/30 text-indigo-200"
                          : "border-slate-600 bg-white/10 text-slate-700 dark:text-slate-400 hover:bg-white/20 dark:hover:bg-slate-700/60"
                      }`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-900 dark:text-white">Devices (optional)</p>
              {deviceOptions.length === 0 ? (
                <div className="rounded-xl border border-indigo-400/30 bg-indigo-500/20 px-3 py-2 text-sm text-indigo-200">
                  No devices found for the selected room.
                </div>
              ) : (
                <div className="grid max-h-48 grid-cols-1 gap-2 overflow-auto rounded-xl border border-indigo-400/30 bg-white/10 p-3 backdrop-blur dark:bg-slate-800/40 md:grid-cols-2">
                  {deviceOptions.map((device) => {
                    const id = Number(device.id);
                    const selected = form.device_ids.includes(id);
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => handleDeviceToggle(id)}
                        className={`flex items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition ${
                          selected
                            ? "border-indigo-400/40 bg-indigo-500/20 text-indigo-200"
                            : "border-slate-600 bg-slate-800/40 text-slate-300 hover:bg-slate-800/60"
                        }`}
                      >
                        <span className="font-medium">{device.name}</span>
                        <span className="text-xs uppercase">{selected ? "Selected" : "Select"}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-xl border border-slate-600 bg-white/10 px-4 py-2 text-sm font-semibold text-slate-300 backdrop-blur hover:bg-white/20"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-xl border border-emerald-400/30 bg-emerald-500/80 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {submitting ? "Saving..." : editingId ? "Update" : "Create"}
              </button>
            </div>
          </form>
        </Modal>
      </div>
    </section>
  );
};

export default Schedules;