import { useEffect, useState } from "react";
import RuleTable from "../components/automation/RuleTable";
import RuleForm from "../components/automation/RuleForm";
import Modal from "../components/ui/Modal";
import { summary } from "../constants/mockData";
import { api } from "../api";

const LOCATION_ID = 1;

const compareMap = {
  "Lớn hơn": ">",
  "Nhỏ hơn": "<",
  Bằng: "=",
};

const Automation = () => {
  const [rules, setRules] = useState([]);
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    applyTo: "Khu vực 1",
    metric: "Temperature",
    compare: "Lớn hơn",
    value: "",
    action: "Bật máy lạnh",
    alertLevel: "Medium",
    active: true,
  });

  const mapRule = (r) => ({
    id: r.rule_id,
    name: r.name,
    applyTo: r.apply_to,
    foodType: r.food_type,
    condition: `${r.metric} ${r.compare_op} ${r.threshold_value}`,
    action: r.action_name,
    active: r.is_active,
  });

  const fetchRules = async () => {
    const res = await api.getAutomationRules();
    setRules((res.data || []).map(mapRule));
  };

  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);

        const [rulesRes, zonesRes] = await Promise.all([
          api.getAutomationRules(),
          api.getZones(LOCATION_ID),
        ]);

        setRules((rulesRes.data || []).map(mapRule));

        const zoneList = zonesRes.data || [];
        setZones(zoneList);
        if (zoneList.length > 0) {
          setForm((prev) => ({ ...prev, applyTo: zoneList[0].name }));
        }
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
      await api.createAutomationRule({
        name: formData.name,
        apply_to: formData.applyTo,
        food_type: "Rau củ",
        metric: formData.metric,
        compare_op: compareMap[formData.compare] || ">",
        threshold_value: Number(formData.value),
        action_name: formData.action,
        alert_level: formData.alertLevel,
        is_active: formData.active,
      });

      setIsModalOpen(false);
      setForm((prev) => ({ ...prev, name: "", value: "" }));
      await fetchRules();
    } catch (err) {
      alert(err.message || "Không tạo được rule");
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.deleteAutomationRule(id);
      await fetchRules();
    } catch (err) {
      alert(err.message || "Không xóa được rule");
    }
  };

  const handleToggle = async (id) => {
    try {
      await api.toggleAutomationRule(id);
      await fetchRules();
    } catch (err) {
      alert(err.message || "Không cập nhật được trạng thái");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-2xl bg-white p-6 shadow-lg lg:flex-row lg:items-center lg:justify-between">
        <h1 className="text-3xl font-bold text-[#24124d]">Automation Rules</h1>
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-full bg-[#ece6f8] px-4 py-2 text-sm font-medium text-[#24124d]">{summary.location}</span>
          <span className="rounded-full bg-[#ece6f8] px-4 py-2 text-sm font-medium text-[#24124d]">Rau củ</span>
          <button
            onClick={() => setIsModalOpen(true)}
            className="rounded-xl bg-gradient-to-r from-[#7c3aed] to-[#a855f7] px-4 py-2 text-sm font-semibold text-white shadow transition hover:brightness-110"
          >
            + Thêm quy tắc
          </button>
        </div>
      </div>

      {loading ? <div className="rounded-xl bg-white p-4">Đang tải...</div> : <RuleTable rules={rules} onDelete={handleDelete} onToggle={handleToggle} />}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <RuleForm
          form={form}
          setForm={setForm}
          zoneOptions={zones}
          onCancel={() => setIsModalOpen(false)}
          onSave={handleSave}
        />
      </Modal>
    </div>
  );
};

export default Automation;

