import { useEffect, useState } from "react";
import RuleTable from "../components/automation/RuleTable";
import RuleForm from "../components/automation/RuleForm";
import Modal from "../components/ui/Modal";
import { api } from "../api";

const LOCATION_ID = 1;
const DEVICE_TYPE_OPTIONS = ["fan", "ac", "humidifier", "dehumidifier", "light", "door"];

const compareMap = { "Lớn hơn": ">", "Nhỏ hơn": "<", Bằng: "=" };
const reverseCompareMap = { ">": "Lớn hơn", "<": "Nhỏ hơn", "=": "Bằng" };

const baseForm = {
  name: "",
  locationId: null,
  zoneId: null,
  floorId: null,
  roomId: null,
  applyTo: "",
  metric: "Temperature",
  compare: "Lớn hơn",
  value: "",
  actionId: null,
  actionType: "action",
  actionOnOff: "on",
  actionDeviceType: "fan",
  actionDeviceIds: [],
  alertLevel: "Medium",
  active: true,
};

const Automation = () => {
  const [rules, setRules] = useState([]);
  const [zones, setZones] = useState([]);
  const [floors, setFloors] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [allRooms, setAllRooms] = useState([]);
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(baseForm);
  const [errors, setErrors] = useState({
    fetch: null,
    save: null,
    delete: null,
    toggle: null,
    general: null,
  });

  const mapRule = (r) => {
    // Extract and lookup device names with IDs
    let deviceNames = [];
    if (r.action_device_ids_normalized) {
      const deviceIds = r.action_device_ids_normalized
        .split(",")
        .map((id) => Number(id.trim()))
        .filter((id) => id > 0);
      deviceNames = deviceIds
        .map((id) => {
          const device = devices.find((d) => d.id === id);
          return device ? `${device.name} (ID: ${id})` : `#${id}`;
        })
        .filter((name) => name);
    }

    // Action column: show only "Bật" or "Tắt" based on action_mode
    // If action_mode is null but devices exist, fall back to action_name or "Custom"
    // If both are null but actionDeviceIds exist, mark as "Device Action"
    let actionDisplay = "--";
    if (r.action_mode === "off") {
      actionDisplay = "Tắt";
    } else if (r.action_mode === "on") {
      actionDisplay = "Bật";
    } else if (r.action_name) {
      actionDisplay = r.action_name;
    } else if (deviceNames.length > 0) {
      // Has devices but no action_mode or name: show a generic label
      actionDisplay = "Device Action";
    }
    // console.log(r);

    return {
      id: r.rule_id,
      name: r.name,
      applyTo: r.room_name || r.apply_to,
      foodType: r.food_type_name || r.food_type,
      condition: `${r.metric} ${r.compare_op} ${r.threshold_value}`,
      action: actionDisplay,
      alertLevel: r.alert_level,
      active: Boolean(r.is_active),
      devices: deviceNames,
      raw: r,
    };
  };

  const clearError = (errorKey) => {
    setErrors((prev) => ({ ...prev, [errorKey]: null }));
  };

  const setError = (errorKey, message) => {
    setErrors((prev) => ({ ...prev, [errorKey]: message }));
  };

  const fetchRules = async () => {
    const res = await api.getAutomationRules();
    setRules((res.data || []).map(mapRule));
    // console.log(rules);
  };

  // Re-map rules when data changes (no longer needed since API returns names)
  useEffect(() => {
    if (rules.length > 0) {
      // API now returns room_name and action_name_normalized directly, so no remapping needed
    }
  }, []);

  // Fetch zones and all rooms when location changes
  useEffect(() => {
    const loadZonesAndRooms = async () => {
      try {
        clearError("general");
        const zonesRes = await api.getZones(LOCATION_ID);
        setZones(zonesRes.data || []);
        
        // Fetch all rooms from all zones and floors
        const allRoomsData = [];
        const zonesList = zonesRes.data || [];
        
        for (const zone of zonesList) {
          try {
            const floorsRes = await api.getFloors(zone.zone_id);
            const floorsList = floorsRes.data || [];
            
            for (const floor of floorsList) {
              try {
                const roomsRes = await api.getRooms(floor.floor_id);
                const roomsList = roomsRes.data || [];
                allRoomsData.push(...roomsList);
              } catch (err) {
                console.error("Failed to load rooms for floor:", floor.floor_id, err);
                setError("general", `Lỗi tải phòng cho tầng ${floor.floor_id}`);
              }
            }
          } catch (err) {
            console.error("Failed to load floors for zone:", zone.zone_id, err);
            setError("general", `Lỗi tải tầng cho khu vực ${zone.zone_id}`);
          }
        }
        
        setAllRooms(allRoomsData);
      } catch (err) {
        const errorMsg = err.message || "Tải khu vực thất bại";
        setError("general", errorMsg);
        console.error("Failed to load zones:", err);
      }
    };
    loadZonesAndRooms();
  }, []);

  // Fetch floors when zone changes
  useEffect(() => {
    const loadFloors = async () => {
      if (!form.zoneId) {
        setFloors([]);
        return;
      }
      try {
        clearError("general");
        const res = await api.getFloors(form.zoneId);
        setFloors(res.data || []);
      } catch (err) {
        const errorMsg = err.message || "Tải tầng thất bại";
        setError("general", errorMsg);
        console.error("Failed to load floors:", err);
        setFloors([]);
      }
    };
    loadFloors();
  }, [form.zoneId]);

  // Fetch rooms when floor changes
  useEffect(() => {
    const loadRooms = async () => {
      if (!form.floorId) {
        setRooms([]);
        return;
      }
      try {
        clearError("general");
        const res = await api.getRooms(form.floorId);
        setRooms(res.data || []);
      } catch (err) {
        const errorMsg = err.message || "Tải phòng thất bại";
        setError("general", errorMsg);
        console.error("Failed to load rooms:", err);
        setRooms([]);
      }
    };
    loadRooms();
  }, [form.floorId]);

  useEffect(() => {
    const init = async () => {
      try {
        clearError("fetch");
        setLoading(true);
        const [rulesRes, devicesRes] = await Promise.all([
          api.getAutomationRules(),
          api.getDevices(),
        ]);
        setRules((rulesRes.data || []).map(mapRule));
        setDevices(devicesRes.data || []);
      } catch (err) {
        const errorMsg = err.message || "Tải dữ liệu thất bại";
        setError("fetch", errorMsg);
        console.error("Load automation page failed:", err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const handleSave = async (formData) => {
    try {
      clearError("save");
      const payload = {
        name: formData.name,
        room_id: formData.roomId || null,
        metric: formData.metric,
        compare_op: compareMap[formData.compare] || ">",
        threshold_value: Number(formData.value),
        alert_level: formData.alertLevel,
        is_active: formData.active,
      };

      // Prepare action fields. Save action_name and legacy action_device_* fields
      // so the automation rule stores a direct action description and device list.
      if (formData.actionType === "alert") {
        payload.action_id = null;
        payload.action_mode = null;
        payload.device_ids = [];
        payload.action_name = null;
        payload.action_device_ids = null;
        payload.action_device_types = null;
      } else {
        const selectedDeviceIds = (formData.actionDeviceIds || []).map(Number).filter((id) => id > 0);
        payload.action_id = null;
        // Persist the on/off mode so the table shows Bật/Tắt correctly and backend can actuate
        payload.action_mode = formData.actionOnOff || "on";
        // Send normalized device id list to backend for join table
        payload.device_ids = selectedDeviceIds;

        // Also set legacy display fields so action_name and action_device_ids are stored
        const selectedDeviceNames = selectedDeviceIds
          .map((id) => devices.find((d) => d.id === id || d.deviceId === id)?.name)
          .filter(Boolean);
        payload.action_name = selectedDeviceNames.length > 0
          ? selectedDeviceNames.join(", ")
          : `${formData.actionDeviceType || "device"} ${formData.actionOnOff || "on"}`;
        payload.action_device_ids = selectedDeviceIds.length > 0 ? selectedDeviceIds.join(",") : null;
        payload.action_device_types = (formData.actionDeviceType
          ? selectedDeviceIds.map(() => formData.actionDeviceType).join(",")
          : null);
      }
      // console.log(payload);
      if (editingId) await api.updateAutomationRule(editingId, payload);
      else await api.createAutomationRule(payload);

      setIsModalOpen(false);
      setEditingId(null);
      setForm(baseForm);
      await fetchRules();
    } catch (err) {
      const errorMsg = err.message || "Không lưu được rule";
      setError("save", errorMsg);
      console.error("Save error:", err);
    }
  };

  const handleEdit = async (rule) => {
    const raw = rule.raw || {};
    setEditingId(rule.id);
    
    const roomId = raw.room_id || (raw.apply_to ? Number(raw.apply_to) : null);
    let selectedZoneId = null;
    let selectedFloorId = null;

    // If there's a room specified, find its zone and floor hierarchy
    if (roomId && zones.length > 0) {
      try {
        clearError("general");
        for (const zone of zones) {
          const floorsRes = await api.getFloors(zone.zone_id);
          const zoneFloors = floorsRes.data || [];
          
          for (const floor of zoneFloors) {
            const roomsRes = await api.getRooms(floor.floor_id);
            const floorRooms = roomsRes.data || [];
            
            // Check if target room is in this floor
            if (floorRooms.find(r => r.room_id === roomId)) {
              selectedZoneId = zone.zone_id;
              selectedFloorId = floor.floor_id;
              setFloors(zoneFloors);
              setRooms(floorRooms);
              break;
            }
          }
          
          if (selectedZoneId) break;
        }
      } catch (err) {
        const errorMsg = err.message || "Tải phân cấp phòng thất bại";
        setError("general", errorMsg);
        console.error("Failed to load room hierarchy:", err);
      }
    }

    const deviceIds = raw.action_device_ids_normalized 
      ? raw.action_device_ids_normalized.split(',').filter(id => id).map(String)
      : [];

    setForm({
      name: raw.name || "",
      locationId: null,
      zoneId: selectedZoneId,
      floorId: selectedFloorId,
      roomId: roomId,
      applyTo: raw.apply_to || "",
      metric: raw.metric || "Temperature",
      compare: reverseCompareMap[raw.compare_op] || "Lớn hơn",
      value: raw.threshold_value ?? "",
      actionId: raw.action_id || null,
      // Detect action type: it's an action when there is an action_name, action_id,
      // action_mode, or device ids present; otherwise treat as alert-only.
      actionType: (raw.action_mode || raw.action_id || raw.action_name || raw.action_device_ids_normalized || raw.action_device_ids || (raw.device_ids && raw.device_ids.length)) ? "action" : "alert",
      actionOnOff: raw.action_mode || "on",
      actionDeviceType: raw.action_device_types
        ? String(raw.action_device_types).split(',')[0]
        : "fan",
      actionDeviceIds: deviceIds,
      alertLevel: raw.alert_level || "Medium",
      active: Boolean(raw.is_active),
    });
    setIsModalOpen(true);
  };

  const handleCreate = () => {
    setEditingId(null);
    setForm(baseForm);
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    try {
      clearError("delete");
      await api.deleteAutomationRule(id);
      await fetchRules();
    } catch (err) {
      const errorMsg = err.message || "Không xóa được rule";
      setError("delete", errorMsg);
      console.error("Delete error:", err);
    }
  };

  const handleToggle = async (id) => {
    try {
      clearError("toggle");
      await api.toggleAutomationRule(id);
      await fetchRules();
    } catch (err) {
      const errorMsg = err.message || "Không toggle được rule";
      setError("toggle", errorMsg);
      console.error("Toggle error:", err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Error Display Section */}
      {(errors.fetch || errors.save || errors.delete || errors.toggle || errors.general) && (
        <div className="space-y-2">
          {errors.general && (
            <div className="flex items-center justify-between rounded-lg bg-yellow-50 p-4 border-l-4 border-yellow-500">
              <div className="flex items-center gap-3">
                <span className="text-lg text-yellow-600">⚠️</span>
                <div>
                  <p className="font-semibold text-yellow-800">Lỗi</p>
                  <p className="text-sm text-yellow-700">{errors.general}</p>
                </div>
              </div>
              <button
                onClick={() => clearError("general")}
                className="text-yellow-600 hover:text-yellow-800"
              >
                ✕
              </button>
            </div>
          )}
          {errors.fetch && (
            <div className="flex items-center justify-between rounded-lg bg-red-50 p-4 border-l-4 border-red-500">
              <div className="flex items-center gap-3">
                <span className="text-lg text-red-600">⚠️</span>
                <div>
                  <p className="font-semibold text-red-800">Lỗi tải dữ liệu</p>
                  <p className="text-sm text-red-700">{errors.fetch}</p>
                </div>
              </div>
              <button
                onClick={() => clearError("fetch")}
                className="text-red-600 hover:text-red-800"
              >
                ✕
              </button>
            </div>
          )}
          {errors.save && (
            <div className="flex items-center justify-between rounded-lg bg-orange-50 p-4 border-l-4 border-orange-500">
              <div className="flex items-center gap-3">
                <span className="text-lg text-orange-600">⚠️</span>
                <div>
                  <p className="font-semibold text-orange-800">Lỗi lưu quy tắc</p>
                  <p className="text-sm text-orange-700">{errors.save}</p>
                </div>
              </div>
              <button
                onClick={() => clearError("save")}
                className="text-orange-600 hover:text-orange-800"
              >
                ✕
              </button>
            </div>
          )}
          {errors.delete && (
            <div className="flex items-center justify-between rounded-lg bg-red-50 p-4 border-l-4 border-red-500">
              <div className="flex items-center gap-3">
                <span className="text-lg text-red-600">⚠️</span>
                <div>
                  <p className="font-semibold text-red-800">Lỗi xóa quy tắc</p>
                  <p className="text-sm text-red-700">{errors.delete}</p>
                </div>
              </div>
              <button
                onClick={() => clearError("delete")}
                className="text-red-600 hover:text-red-800"
              >
                ✕
              </button>
            </div>
          )}
          {errors.toggle && (
            <div className="flex items-center justify-between rounded-lg bg-yellow-50 p-4 border-l-4 border-yellow-500">
              <div className="flex items-center gap-3">
                <span className="text-lg text-yellow-600">⚠️</span>
                <div>
                  <p className="font-semibold text-yellow-800">Lỗi thay đổi trạng thái</p>
                  <p className="text-sm text-yellow-700">{errors.toggle}</p>
                </div>
              </div>
              <button
                onClick={() => clearError("toggle")}
                className="text-yellow-600 hover:text-yellow-800"
              >
                ✕
              </button>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col gap-4 rounded-2xl bg-white p-6 shadow-lg lg:flex-row lg:items-center lg:justify-between">
        <h1 className="text-3xl font-bold text-[#24124d]">Automation Rules</h1>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleCreate}
            className="rounded-xl bg-gradient-to-r from-[#7c3aed] to-[#a855f7] px-4 py-2 text-sm font-semibold text-white shadow transition hover:brightness-110"
          >
            + Thêm quy tắc
          </button>
        </div>
      </div>

      {loading ? (
        <div className="rounded-xl bg-white p-4">Đang tải...</div>
      ) : (
        <RuleTable
          rules={rules}
          onDelete={handleDelete}
          onToggle={handleToggle}
          onEdit={handleEdit}
        />
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <RuleForm
          form={form}
          setForm={setForm}
          zones={zones}
          floors={floors}
          rooms={rooms}
          deviceOptions={devices}
          deviceTypeOptions={DEVICE_TYPE_OPTIONS}
          isEditing={Boolean(editingId)}
          onCancel={() => setIsModalOpen(false)}
          onSave={handleSave}
        />
      </Modal>
    </div>
  );
};

export default Automation;