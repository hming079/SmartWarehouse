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
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(baseForm);

  const mapRule = (r) => {
    return {
      id: r.rule_id,
      name: r.name,
      applyTo: r.room_name || r.apply_to,
      foodType: r.food_type_name || r.food_type,
      condition: `${r.metric} ${r.compare_op} ${r.threshold_value}`,
      action: r.action_name_normalized || r.action_name,
      alertLevel: r.alert_level,
      active: Boolean(r.is_active),
      raw: r,
    };
  };

  const fetchRules = async () => {
    const res = await api.getAutomationRules();
    setRules((res.data || []).map(mapRule));
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
        const [rulesRes, devicesRes, actionsRes] = await Promise.all([
          api.getAutomationRules(),
          api.getDevices(),
          api.getActions?.() || Promise.resolve({ data: [] }),
        ]);
        setRules((rulesRes.data || []).map(mapRule));
        setDevices(devicesRes.data || []);
        setActions(actionsRes.data || []);
      } catch (err) {
        console.error("Load automation page failed:", err.message);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const handleSave = async (formData) => {
    try {
      const payload = {
        name: formData.name,
        room_id: formData.roomId || null,
        metric: formData.metric,
        compare_op: compareMap[formData.compare] || ">",
        threshold_value: Number(formData.value),
        alert_level: formData.alertLevel,
        is_active: formData.active,
      };

      if (formData.actionType === "alert") {
        payload.action_id = null;
        payload.device_ids = [];
      } else {
        payload.action_id = formData.actionId || null;
        payload.device_ids = (formData.actionDeviceIds || []).map(Number).filter(id => id > 0);
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
    
    const roomId = raw.room_id || (raw.apply_to ? Number(raw.apply_to) : null);
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
      actionType: raw.action_id ? "action" : "alert",
      actionOnOff: "on",
      actionDeviceType: "fan",
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
          actions={actions}
          isEditing={Boolean(editingId)}
          onCancel={() => setIsModalOpen(false)}
          onSave={handleSave}
        />
      </Modal>
    </div>
  );
};

export default Automation;