import { useState } from "react";
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

  return (
    <section>
      <div className="mb-6 inline-flex rounded-2xl bg-[#b7afe6] p-1">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`rounded-xl px-6 py-3 text-2xl font-semibold transition ${
              activeTab === tab ? "bg-white text-[#1d1645]" : "text-[#1d1645]"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Card className="bg-[#ece6f8] p-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-4xl font-bold text-[#1d1645]">Air Conditioner</h2>
              <div className="flex items-center gap-3">
                <span className="text-4xl font-semibold uppercase text-[#1d1645]">
                  {acOn ? "ON" : "OFF"}
                </span>
                <Toggle checked={acOn} onChange={() => setAcOn((prev) => !prev)} />
              </div>
            </div>

            <div className="flex items-center justify-center gap-4">
              <Button className="h-12 w-12 p-0 text-3xl">-</Button>
              <Gauge value={summary.temperature} />
              <Button className="h-12 w-12 p-0 text-3xl">+</Button>
            </div>
          </Card>

          <Card className="bg-[#ece6f8] p-4">
            <DeviceGrid devices={deviceList} onToggle={handleToggleDevice} />
          </Card>
        </div>

        <div className="space-y-6">
          <TemperatureWidget temperature={summary.temperature} />
          <HumidityWidget humidity={summary.humidity} />
          <Card className="bg-[#ece6f8] p-8 text-center text-gray-700">
            <p className="mb-6 text-4xl">Active/All</p>
            <p className="text-6xl font-bold">
              {summary.activeDevices}/{summary.totalDevices}
            </p>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default Devices;

