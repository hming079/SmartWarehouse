import Card from "../ui/Card";
import Toggle from "../ui/Toggle";

const iconMap = {
  temperature: "🌡",
  humidity: "💧",
  lights: "💡",
  fan: "🌀",
  dryer: "🌬",
  ac: "❄",
  fridge: "🧊",
};

const DeviceCard = ({ device, onToggle }) => {
  const isOn = device.status === "on";

  return (
    <Card
      className={`p-5 ${
        isOn ? "bg-[#fff4b8] text-[#3b2f00]" : "bg-[#d8c7f4] text-[#18054a]"
      }`}
    >
      <div className="mb-6 flex items-center justify-between">
        <p className="text-3xl leading-none">{iconMap[device.type] || "◻"}</p>
        <Toggle checked={isOn} onChange={onToggle} />
      </div>
      <p className="text-3xl font-bold lowercase">{device.status}</p>
      <p className="mt-2 text-2xl font-medium">{device.name + '_' + device.deviceId}</p>
    </Card>
  );
};

export default DeviceCard;

