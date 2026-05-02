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
  applyTo: "Khu vực 1",
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
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(baseForm);

  const mapRule = (r) => ({
    id: r.rule_id,
    name: r.name,
    applyTo: r.apply_to,
    foodType: r.food_type,
    condition: `${r.metric} ${r.compare_op} ${r.threshold_value}`,
    action: r.action_name,
    alertLevel: r.alert_level,
    active: Boolean(r.is_active),
    raw: r,
  });

  const fetchRules = async () => {
    const res = await api.getAutomationRules();
    setRules((res.data || []).map(mapRule));
  };

  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        const [rulesRes, zonesRes, devicesRes] = await Promise.all([api.getAutomationRules(), api.getZones(LOCATION_ID), api.getDevices()]);
        setRules((rulesRes.data || []).map(mapRule));
        setZones(zonesRes.data || []);
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
      const payload = {
        name: formData.name,
        apply_to: formData.applyTo,
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
      setForm((prev) => ({ ...baseForm, applyTo: prev.applyTo || baseForm.applyTo }));
      await fetchRules();
    } catch (err) {
      alert(err.message || "Không lưu được rule");
    }
  };

  const handleEdit = (rule) => {
    const raw = rule.raw || {};
    setEditingId(rule.id);
    setForm({
      name: raw.name || "",
      applyTo: raw.apply_to || zones?.[0]?.name || "",
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
    setForm((prev) => ({ ...baseForm, applyTo: prev.applyTo || zones?.[0]?.name || baseForm.applyTo }));
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => { await api.deleteAutomationRule(id); await fetchRules(); };
  const handleToggle = async (id) => { await api.toggleAutomationRule(id); await fetchRules(); };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-2xl bg-white p-6 shadow-lg lg:flex-row lg:items-center lg:justify-between">
        <h1 className="text-3xl font-bold text-[#24124d]">Automation Rules</h1>
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={handleCreate} className="rounded-xl bg-gradient-to-r from-[#7c3aed] to-[#a855f7] px-4 py-2 text-sm font-semibold text-white shadow transition hover:brightness-110">+ Thêm quy tắc</button>
        </div>
      </div>

      {loading ? <div className="rounded-xl bg-white p-4">Đang tải...</div> : <RuleTable rules={rules} onDelete={handleDelete} onToggle={handleToggle} onEdit={handleEdit} />}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <RuleForm form={form} setForm={setForm} zoneOptions={zones} deviceOptions={devices} deviceTypeOptions={DEVICE_TYPE_OPTIONS} isEditing={Boolean(editingId)} onCancel={() => setIsModalOpen(false)} onSave={handleSave} />
      </Modal>
    </div>
  );
};

export default Automation;
