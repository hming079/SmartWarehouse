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
    <section className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#24124d] flex items-center gap-3">
            <CalendarClock className="text-[#7c3aed]" size={28} />
            Schedules
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Configure recurring automation schedules for your devices.
          </p>
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center">
          <div className="flex items-center gap-2 flex-wrap md:flex-nowrap">
            <select
              value={selectedZone || ""}
              onChange={(e) => {
                const zoneId = e.target.value ? Number(e.target.value) : null;
                setSelectedZone(zoneId);
                setSelectedFloor(null);
                setSelectedRoom(null);
              }}
              className="rounded-xl border border-[#d6cdee] bg-white px-3 py-2 text-sm font-medium"
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
              className="rounded-xl border border-[#d6cdee] bg-white px-3 py-2 text-sm font-medium disabled:bg-gray-100 disabled:text-gray-400"
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
              className="rounded-xl border border-[#d6cdee] bg-white px-3 py-2 text-sm font-medium disabled:bg-gray-100 disabled:text-gray-400"
            >
              <option value="">All Rooms</option>
              {rooms.map((room) => (
                <option key={room.room_id} value={room.room_id}>
                  {room.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1 rounded-xl bg-white p-1 border border-[#e3dbf2]">
            {[
              { key: "all", label: "All" },
              { key: "active", label: "Active" },
              { key: "inactive", label: "Inactive" },
            ].map((item) => (
              <button
                key={item.key}
                onClick={() => setActiveFilter(item.key)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  activeFilter === item.key 
                    ? "bg-[#7c3aed]/10 text-[#7c3aed] shadow-sm" 
                    : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#7c3aed] to-[#a855f7] px-4 py-2 text-sm font-semibold text-white shadow-lg transition-all hover:brightness-110"
          >
            <Plus size={16} /> Add schedule
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-[#e3dbf2] bg-white p-4 md:p-6 shadow-sm">
        {loading && (
          <div className="flex justify-center p-10">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-[#7c3aed]"></div>
          </div>
        )}
        {!loading && error && <div className="rounded-xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div>}
        
        {!loading && !error && items.length === 0 && (
          <div className="p-10 text-center text-gray-400">
            <CalendarClock className="mx-auto mb-3 opacity-50" size={48} />
            <p>No schedules found.</p>
          </div>
        )}

        {!loading && !error && items.length > 0 && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {items.map((item) => (
              <div key={item.id} className="group relative overflow-hidden rounded-2xl border border-[#e3dbf2] bg-[#fcfbff] p-5 transition-all hover:border-[#7c3aed]/50 hover:shadow-lg">
                <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-[#7c3aed]/5 blur-[50px] transition-all group-hover:bg-[#7c3aed]/10" />
                
                <div className="relative z-10">
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-lg font-bold text-[#24124d]">{item.name || `Schedule #${item.id}`}</h3>
                      <div className="mt-1 flex items-center gap-2 text-xs font-medium text-gray-500">
                        <span className="flex items-center gap-1 rounded-md border border-[#e3dbf2] bg-white px-2 py-1">
                          {toTimeInput(item.start_time)} <ArrowRight size={10} /> {toTimeInput(item.end_time)}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleToggle(item.id)}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        item.is_active ? 'bg-[#7c3aed]' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          item.is_active ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="mb-4 space-y-2">
                    {item.room_name && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500">Room:</span>
                        <span className="font-medium text-[#24124d]">{item.room_name}</span>
                      </div>
                    )}
                    
                    <div className="flex flex-wrap gap-1">
                      {DAY_OPTIONS.map((day) => {
                        const isActive = item.days_of_week?.includes(day);
                        return (
                          <span key={day} className={`rounded border px-1.5 py-0.5 text-[10px] font-bold ${isActive ? "border-[#7c3aed]/30 bg-[#7c3aed]/10 text-[#7c3aed]" : "border-[#e3dbf2] bg-white text-gray-400"}`}>
                            {day.charAt(0)}
                          </span>
                        );
                      })}
                    </div>
                    
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">Action:</span>
                      <span className={`rounded-md px-2 py-0.5 font-bold ${
                        item.action === "POWER_ON" ? "bg-emerald-500/20 text-emerald-300" : 
                        item.action === "POWER_OFF" ? "bg-rose-500/20 text-rose-300" : 
                        "bg-amber-500/20 text-amber-300"
                      }`}>
                        {getActionLabel(item.action)}
                      </span>
                    </div>
                    
                    <div className="flex items-start justify-between text-xs">
                      <span className="mt-0.5 text-gray-500">Devices:</span>
                      <span className="max-w-[60%] truncate text-right font-medium text-[#24124d]" title={item.device_names}>
                        {item.device_names || "No devices"}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 flex gap-2 border-t border-[#e3dbf2] pt-4">
                    <button
                      onClick={() => openEditModal(item)}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#f5f1fb] px-3 py-2 text-xs font-semibold text-[#5c4f80] transition-all hover:bg-[#eadef7]"
                    >
                      <Edit size={14} /> Edit
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600 transition-all hover:bg-rose-100"
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
            <h2 className="text-xl font-bold text-[#24124d]">
              {editingId ? "Update schedule" : "Create schedule"}
            </h2>
          </div>

          {formError && (
            <div className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
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
              Area (Khu vực)
              <select
                value={selectedZone || ""}
                onChange={(e) => {
                  const zoneId = e.target.value ? Number(e.target.value) : null;
                  setSelectedZone(zoneId);
                  setSelectedFloor(null);
                  setSelectedRoom(null);
                }}
                className="rounded-xl border border-[#d6cdee] bg-white px-3 py-2"
              >
                <option value="">Select Area</option>
                {zones.map((zone) => (
                  <option key={zone.zone_id} value={zone.zone_id}>
                    {zone.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1 text-sm font-medium text-[#2f2651]">
              Floor (Tầng)
              <select
                value={selectedFloor || ""}
                onChange={(e) => {
                  const floorId = e.target.value ? Number(e.target.value) : null;
                  setSelectedFloor(floorId);
                  setSelectedRoom(null);
                }}
                disabled={!selectedZone}
                className="rounded-xl border border-[#d6cdee] bg-white px-3 py-2 disabled:bg-gray-100 disabled:text-gray-400"
              >
                <option value="">Select Floor</option>
                {floors.map((floor) => (
                  <option key={floor.floor_id} value={floor.floor_id}>
                    Floor {floor.floor_number}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1 text-sm font-medium text-[#2f2651]">
              Room (Phòng)
              <select
                value={selectedRoom || ""}
                onChange={(e) => {
                  const roomNum = e.target.value ? Number(e.target.value) : null;
                  setSelectedRoom(roomNum);
                }}
                disabled={!selectedFloor}
                className="rounded-xl border border-[#d6cdee] bg-white px-3 py-2 disabled:bg-gray-100 disabled:text-gray-400"
              >
                <option value="">Select Room</option>
                {rooms.map((room) => (
                  <option key={room.room_id} value={room.room_id}>
                    {room.name}
                  </option>
                ))}
              </select>
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

          <div className="space-y-2">
            <p className="text-sm font-medium text-[#2f2651]">Devices (optional)</p>
            {deviceOptions.length === 0 ? (
              <div className="rounded-xl bg-[#f5f1fb] px-3 py-2 text-sm text-[#5c4f80]">
                No devices found for the selected room.
              </div>
            ) : (
              <div className="grid max-h-48 grid-cols-1 gap-2 overflow-auto rounded-xl border border-[#e3dbf2] bg-[#fcfbff] p-3 md:grid-cols-2">
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
                          ? "border-[#6c4fd3] bg-[#efe7ff] text-[#2f2160]"
                          : "border-[#e5def3] bg-white text-[#3d2f64] hover:bg-[#f8f5fe]"
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
    </section>
  );
};

export default Schedules;