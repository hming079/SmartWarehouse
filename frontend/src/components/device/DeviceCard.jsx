import Card from "../ui/Card";
import Toggle from "../ui/Toggle";

const iconMap = {
  temperature: "🌡",
  lights: "💡",
  ac: "❄",
  fridge: "🧊",
};

const DeviceCard = ({ device, onToggle }) => {
  const isOn = device.status === "on";

  return (
    <Card
      className={`p-5 ${
        isOn ? "bg-[#0f1177] text-white" : "bg-[#d8c7f4] text-[#18054a]"
      }`}
    >
      <div className="mb-6 flex items-center justify-between">
        <p className="text-4xl leading-none">{iconMap[device.type] || "◻"}</p>
        <Toggle checked={isOn} onChange={onToggle} />
      </div>
      <p className="text-3xl font-bold lowercase">{device.status}</p>
      <p className="mt-2 text-2xl font-medium">{device.name}</p>
    </Card>
  );
};

export default DeviceCard;

