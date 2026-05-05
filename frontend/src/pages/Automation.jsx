import { useEffect, useState } from "react";
import RuleTable from "../components/automation/RuleTable";
import RuleForm from "../components/automation/RuleForm";
import Modal from "../components/ui/Modal";
import { summary } from "../constants/mockData";
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
  action: "",
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
  const [allRooms, setAllRooms] = useState([]); // For lookup purposes
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(baseForm);

  const mapRule = (r) => {
    // Find room by ID in the allRooms lookup
    const roomData = allRooms.find(room => room.room_id === Number(r.apply_to));
    
    return {
      id: r.rule_id,
      name: r.name,
      applyTo: roomData?.name || r.apply_to,
      foodType: roomData?.food_type_name || r.food_type,
      condition: `${r.metric} ${r.compare_op} ${r.threshold_value}`,
      action: r.action_name,
      alertLevel: r.alert_level,
      active: Boolean(r.is_active),
      raw: r,
    };
  };

  const fetchRules = async () => {
    const res = await api.getAutomationRules();
    setRules((res.data || []).map(mapRule));
  };

  // Re-map rules when allRooms changes
  useEffect(() => {
    if (rules.length > 0) {
      setRules(prevRules => prevRules.map((r) => {
        const rawData = r.raw;
        const roomData = allRooms.find(room => room.room_id === Number(rawData.apply_to));
        return {
          ...r,
          applyTo: roomData?.name || rawData.apply_to,
          foodType: roomData?.food_type_name || rawData.food_type,
        };
      }));
    }
  }, [allRooms]);

  // Fetch zones and all rooms when location changes
  useEffect(() => {
    const loadZonesAndRooms = async () => {
      try {
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
              }
            }
          } catch (err) {
            console.error("Failed to load floors for zone:", zone.zone_id, err);
          }
        }
        
        setAllRooms(allRoomsData);
      } catch (err) {
        console.error("Failed to load zones:", err.message);
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
        const res = await api.getFloors(form.zoneId);
        setFloors(res.data || []);
      } catch (err) {
        console.error("Failed to load floors:", err.message);
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
        const res = await api.getRooms(form.floorId);
        setRooms(res.data || []);
      } catch (err) {
        console.error("Failed to load rooms:", err.message);
        setRooms([]);
      }
    };
    loadRooms();
  }, [form.floorId]);

  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        const [rulesRes, devicesRes] = await Promise.all([
          api.getAutomationRules(),
          api.getDevices(),
        ]);
        setRules((rulesRes.data || []).map(mapRule));
        setDevices(devicesRes.data || []);
      } catch (err) {
        console.error("Load automation page failed:", err.message);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const buildActionName = (f) => `${f.actionOnOff === "off" ? "Tắt" : "Bật"} ${f.actionDeviceType || ""} ${(f.actionDeviceIds || []).map((id) => `#${id}`).join(",")}`.trim();

  const handleSave = async (formData) => {
    try {
      // Use room name for apply_to if a room is selected, otherwise use empty string
      const applyTo = formData.roomId ? String(formData.roomId) : formData.applyTo;

      const payload = {
        name: formData.name,
        apply_to: applyTo,
        food_type: "Rau củ",
        metric: formData.metric,
        compare_op: compareMap[formData.compare] || ">",
        threshold_value: Number(formData.value),
        alert_level: formData.alertLevel,
        is_active: formData.active,
      };

      if (formData.actionType === "alert") {
        payload.action_name = "";
        payload.action_device_ids = "";
        payload.action_device_types = "";
      } else {
        payload.action_name = formData.action || buildActionName(formData);
        payload.action_device_ids = (formData.actionDeviceIds || []).join(",");
        payload.action_device_types = formData.actionDeviceType || "";
      }

      if (editingId) await api.updateAutomationRule(editingId, payload);
      else await api.createAutomationRule(payload);

      setIsModalOpen(false);
      setEditingId(null);
      setForm(baseForm);
      await fetchRules();
    } catch (err) {
      alert(err.message || "Không lưu được rule");
    }
  };

  const handleEdit = async (rule) => {
    const raw = rule.raw || {};
    setEditingId(rule.id);
    
    const roomId = raw.apply_to ? Number(raw.apply_to) : null;
    let selectedZoneId = null;
    let selectedFloorId = null;

    // If there's a room specified, find its zone and floor hierarchy
    if (roomId && zones.length > 0) {
      try {
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
        console.error("Failed to load room hierarchy:", err);
      }
    }

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
      action: raw.action_name || "",
      actionType: raw.action_name ? "action" : "alert",
      actionOnOff: raw.action_name && raw.action_name.toLowerCase().includes("tắt") ? "off" : "on",
      actionDeviceType: raw.action_device_types || "fan",
      actionDeviceIds: raw.action_device_ids ? String(raw.action_device_ids).split(",") : [],
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
    await api.deleteAutomationRule(id);
    await fetchRules();
  };

  const handleToggle = async (id) => {
    await api.toggleAutomationRule(id);
    await fetchRules();
  };

  return (
    <div className="space-y-6">
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