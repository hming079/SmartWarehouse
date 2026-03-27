import { useState, useEffect } from "react";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Toggle from "../components/ui/Toggle";
import Gauge from "../components/ui/Gauge";
import DeviceGrid from "../components/device/DeviceGrid";
import TemperatureWidget from "../components/device/TemperatureWidget";
import HumidityWidget from "../components/device/HumidityWidget";
import { devices as mockDevices, summary, tabs } from "../constants/mockData";

const Devices = () => {
  const [activeTab, setActiveTab] = useState(tabs[0]);
  const [deviceList, setDeviceList] = useState(mockDevices);
  const [acOn, setAcOn] = useState(true);

  const handleToggleDevice = (id) => {
    setDeviceList((prev) =>
      prev.map((d) => (d.id === id ? { ...d, status: d.status === "on" ? "off" : "on" } : d))
    );
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
          if (alive) setPayload(json);
        } catch (err) {
          if (alive) setError(err.message || "Failed to fetch data");
        } finally {
          if (alive) setLoading(false);
        }
      }
  
      loadData();
      const timer = setInterval(loadData, 100000);
  
      return () => {
        alive = false;
        clearInterval(timer);
      };
    }, []);
    const temp = Number(payload?.data?.temperature?.[0]?.value ?? 30).toFixed(2);
    const hum = Number(payload?.data?.humidity?.[0]?.value ?? 30).toFixed(2);
    const ts = payload?.data?.temperature?.[0]?.ts || payload?.data?.humidity?.[0]?.ts;

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
          <Card className="bg-[#ece6f8] p-6">
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

          <Card className="bg-[#ece6f8] p-4">
            <DeviceGrid devices={deviceList} onToggle={handleToggleDevice} />
          </Card>
        </div>
        {/* Right col - Sensor values */}
        <div className="space-y-6">
          <TemperatureWidget temperature={temp} />
          <HumidityWidget humidity={hum} />
          <Card className="bg-[#ece6f8] p-8 text-center text-gray-700">
            <p className="mb-3 text-2xl font-semibold">Active/All</p>
            <p className="text-4xl font-bold">
              {summary.activeDevices}/{summary.totalDevices}
            </p>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default Devices;

