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
  const isOn = device.status === "on" || device.status === true;

  return (
    <Card
      className={`flex h-36 flex-col justify-between p-6 ${
        isOn ? "bg-[#0a0446] text-white" : "bg-[#ebdcf9] text-[#2c1a63]"
      }`}
    >
      <div className="flex items-start justify-between">
        <span className="text-2xl font-bold lowercase">{isOn ? "on" : "off"}</span>
        <Toggle 
          checked={isOn} 
          onChange={onToggle} 
          activeTrackColor="bg-[#64f456]"
          activeKnobColor="bg-white"
          inactiveTrackColor="bg-gray-400"
          inactiveKnobColor="bg-white"
        />
      </div>
      <div className="mt-4 flex items-end justify-between">
        <span className="text-3xl leading-none">{iconMap[device.type] || "◻"}</span>
        <span className="text-base font-medium">{device.name}</span>
      </div>
    </Card>
  );
};

export default DeviceCard;

