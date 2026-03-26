import DeviceCard from "./DeviceCard";

const DeviceGrid = ({ devices, onToggle }) => {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {devices.map((device) => (
        <DeviceCard key={device.id} device={device} onToggle={() => onToggle(device.id)} />
      ))}
    </div>
  );
};

export default DeviceGrid;

