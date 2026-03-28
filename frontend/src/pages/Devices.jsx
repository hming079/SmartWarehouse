import { useEffect, useState } from "react";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Toggle from "../components/ui/Toggle";
import Gauge from "../components/ui/Gauge";
import DeviceGrid from "../components/device/DeviceGrid";
import TemperatureWidget from "../components/device/TemperatureWidget";
import HumidityWidget from "../components/device/HumidityWidget";
import { tabs } from "../constants/mockData";

const toUiStatus = (status) =>
  String(status || "").toUpperCase() === "ON" ? "on" : "off";

const toUiType = (type, name) => {
  const normalized = `${type || ""} ${name || ""}`.toLowerCase();
  if (normalized.includes("temp")) return "temperature";
  if (normalized.includes("humid")) return "humidity";
  if (normalized.includes("fan") || normalized.includes("vent")) return "fan";
  if (normalized.includes("dryer") || normalized.includes("dry")) return "dryer";
  if (normalized.includes("light")) return "lights";
  if (normalized.includes("ac") || normalized.includes("air") || normalized.includes("cool")) return "ac";
  if (normalized.includes("fridge") || normalized.includes("cold")) return "fridge";
  return "lights";
};

const buildTelemetryDevices = (data, deviceStatus, switches = []) => {
  const tempValue = Number(data?.temperature?.[0]?.value ?? NaN);
  const humValue = Number(data?.humidity?.[0]?.value ?? NaN);
  const status = toUiStatus(deviceStatus);

  const switchDevices = Array.isArray(switches)
    ? switches.map((item) => ({
        id: `switch-${item.key}`,
        name: item.name || item.key || "Switch",
        status: toUiStatus(item.status),
        type: toUiType(item.type, item.name || item.key),
      }))
    : [];

  if (switchDevices.length > 0) {
    return switchDevices;
  }

  return [
    {
      id: "telemetry-temperature",
      name: Number.isNaN(tempValue) ? "Temperature" : `Temperature (${tempValue.toFixed(1)} C)`,
      status,
      type: "temperature",
    },
    {
      id: "telemetry-humidity",
      name: Number.isNaN(humValue) ? "Humidity" : `Humidity (${humValue.toFixed(1)}%)`,
      status,
      type: "humidity",
    },
  ];
};

const Devices = () => {
  const [activeTab, setActiveTab] = useState(tabs[0]);
  const [deviceList, setDeviceList] = useState([]);
  const [acOn, setAcOn] = useState(true);
  const [devicesLoading, setDevicesLoading] = useState(true);
  const [devicesError, setDevicesError] = useState("");

  const handleToggleDevice = async (id) => {
    try {
      const device = deviceList.find((d) => d.id === id);
      if (!device) return;

      // Determine new state
      const newStatus = device.status === "on" ? "off" : "on";
      const newValue = newStatus === "on" ? "1" : "0";

      // Extract the key from device id (e.g., "switch-fan_on" -> "fan_on")
      const key = id.startsWith("switch-") ? id.replace("switch-", "") : id;

      setDevicesError("");
      
      const response = await fetch("http://localhost:5000/control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value: newValue }),
      });

      const result = await response.json();
      console.log('Toggle response:', result);
      if (!response.ok) {
        setDevicesError(`Lỗi: ${result.error || "Không thể điều khiển thiết bị"}`);
        return;
      }

      // Update local state optimistically
      setDeviceList((prev) =>
        prev.map((d) => (d.id === id ? { ...d, status: newStatus } : d))
      );
      
      setDevicesError("");
    } catch (err) {
      setDevicesError(`Lỗi kết nối: ${err.message}`);
    }
  };

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [payload, setPayload] = useState(null);

  useEffect(() => {
    let alive = true;

    async function loadData() {
      try {
        setLoading(true);
        setError("");

        const res = await fetch("http://localhost:5000/data");
        if (!res.ok) {
          throw new Error("Request failed with status " + res.status);
        }

        const json = await res.json();
        if (alive) {
          setPayload(json);
          setDeviceList(
            buildTelemetryDevices(json?.data, json?.deviceStatus, json?.switches)
          );
          setAcOn(toUiStatus(json?.deviceStatus) === "on");
          setDevicesError("");
        }
      } catch (err) {
        if (alive) {
          setError(err.message || "Failed to fetch data");
          setDevicesError("Khong the lay danh sach device tu App Core IoT");
        }
      } finally {
        if (alive) {
          setLoading(false);
          setDevicesLoading(false);
        }
      }
    }

    loadData();
    const timer = setInterval(loadData, 5000);

    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, []);

  const temp = Number(payload?.data?.temperature?.[0]?.value ?? 30).toFixed(2);
  const hum = Number(payload?.data?.humidity?.[0]?.value ?? 30).toFixed(2);

  return (
    <section>
      {/* Navbar */}
      <div className="mb-3 inline-flex rounded-xl bg-[#b7afe6] p-1">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`rounded-xl px-4 py-2 text-l font-semibold transition ${
              activeTab === tab ? "bg-white text-[#1d1645]" : "text-[#1d1645]"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>
      {/* Content */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Control device */}
        <div className="space-y-6 xl:col-span-2">
          {/* Air conditioner */}
          {/*<Card className="bg-[#ece6f8] p-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xl font-bold text-[#1d1645]">Air Conditioner</h2>
              <div className="flex items-center gap-3">
                <span className="text-4xl font-semibold uppercase text-[#1d1645]">
                  {acOn ? "ON" : "OFF"}
                </span>
                <Toggle checked={acOn} onChange={() => setAcOn((prev) => !prev)} />
              </div>
            </div>

            <div className="flex items-center justify-center gap-4">
              <Button className="h-12 w-12 p-0 text-3xl">-</Button>
              <Gauge value={Math.ceil(temp)} />
              <Button className="h-12 w-12 p-0 text-3xl">+</Button>
            </div>
          </Card>
            */}
          <Card className="bg-[#ece6f8] p-4">
            {devicesLoading && <p className="mb-3 text-sm text-gray-600">Dang tai devices...</p>}
            {devicesError && <p className="mb-3 text-sm text-red-500">{devicesError}</p>}
            <DeviceGrid devices={deviceList} onToggle={handleToggleDevice} />
          </Card>
        </div>
        {/* Right col - Sensor values */}
        <div className="space-y-6">
          {loading && <p className="text-sm text-gray-500">Dang tai telemetry...</p>}
          {error && <p className="text-sm text-red-500">{error}</p>}
          <TemperatureWidget temperature={temp} />
          <HumidityWidget humidity={hum} />
          {/* <Card className="bg-[#ece6f8] p-8 text-center text-gray-700">
            <p className="mb-3 text-2xl font-semibold">Active/All</p>
            <p className="text-4xl font-bold">
              {activeCount}/{deviceList.length || summary.totalDevices}
            </p>
          </Card> */}
        </div>
      </div>
    </section>
  );
};

export default Devices;

