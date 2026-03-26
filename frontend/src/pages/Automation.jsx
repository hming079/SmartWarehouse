import { useState } from "react";
import RuleTable from "../components/automation/RuleTable";
import RuleForm from "../components/automation/RuleForm";
import Modal from "../components/ui/Modal";
import { summary } from "../constants/mockData";

const initialRules = [
  {
    id: 1,
    name: "Nhiệt độ cao",
    applyTo: "Khu vực 1",
    foodType: "Rau củ",
    condition: "Temp > 5°C",
    action: "Bật máy lạnh",
    active: true,
  },
  {
    id: 2,
    name: "Độ ẩm thấp",
    applyTo: "Khu vực 1",
    foodType: "Rau củ",
    condition: "Temp < 30%",
    action: "Bật tạo độ ẩm",
    active: true,
  },
];

const Automation = () => {
  const [rules] = useState(initialRules);
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

  const handleSave = (formData) => {
    console.log("New automation rule:", formData);
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-2xl bg-white p-6 shadow-lg lg:flex-row lg:items-center lg:justify-between">
        <h1 className="text-3xl font-bold text-[#24124d]">Automation Rules</h1>
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-full bg-[#ece6f8] px-4 py-2 text-sm font-medium text-[#24124d]">
            {summary.location}
          </span>
          <span className="rounded-full bg-[#ece6f8] px-4 py-2 text-sm font-medium text-[#24124d]">
            Rau củ
          </span>
          <button
            onClick={() => setIsModalOpen(true)}
            className="rounded-xl bg-gradient-to-r from-[#7c3aed] to-[#a855f7] px-4 py-2 text-sm font-semibold text-white shadow transition hover:brightness-110"
          >
            + Thêm thiết bị
          </button>
        </div>
      </div>

      <RuleTable rules={rules} />

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <RuleForm
          form={form}
          setForm={setForm}
          onCancel={() => setIsModalOpen(false)}
          onSave={handleSave}
        />
      </Modal>
    </div>
  );
};

export default Automation;

