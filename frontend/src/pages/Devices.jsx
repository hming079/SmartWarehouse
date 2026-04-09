import { NavLink, Navigate, useParams } from "react-router-dom";
import Card from "../components/ui/Card";
import DeviceGrid from "../components/device/DeviceGrid";
import TemperatureWidget from "../components/device/TemperatureWidget";
import HumidityWidget from "../components/device/HumidityWidget";
import { useDeviceData } from "../hooks/deviceHook";

const DEVICE_VIEW_TABS = [
  { key: "card", label: "Card form" },
  { key: "list", label: "List form" },
];

const Devices = () => {
  const { view = "card" } = useParams();
  const normalizedView = String(view).toLowerCase();
  const isCardView = normalizedView === "card";
  const isListView = normalizedView === "list";
  const {
    deviceList,
    devicesLoading,
    devicesError,
    loading,
    error,
    payload,
    handleToggleDevice,
    handleModifyDevice,
    handleDeleteDevice,
    handleAddDevice,
  } = useDeviceData();

  if (!isCardView && !isListView) {
    return <Navigate to="/devices/card" replace />;
  }

  const temp = Number(payload?.data?.temperature?.[0]?.value ?? 30).toFixed(2);
  const hum = Number(payload?.data?.humidity?.[0]?.value ?? 30).toFixed(2);

  return (
    <section>
      {/* Navbar */}
      <div className="mb-3 inline-flex rounded-xl bg-[#b7afe6] p-1">
        {DEVICE_VIEW_TABS.map((tab) => (
          <NavLink
            key={tab.key}
            to={`/devices/${tab.key}`}
            className={({ isActive }) =>
              `rounded-xl px-4 py-2 text-l font-semibold transition ${
                isActive ? "bg-white text-[#1d1645]" : "text-[#1d1645]"
              }`
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </div>
      {/* Add device button */}
      <div className="mb-4 flex justify-start">
        <button
          onClick={handleAddDevice}
          className="rounded-xl bg-[#6c4fd3] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#5d41c2] focus:outline-none focus:ring-2 focus:ring-[#6c4fd3] focus:ring-offset-2"
        >
          + Add Device
        </button> 
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
          {isCardView ? (
            <Card className="bg-[#ece6f8] p-4">
              {devicesLoading && <p className="mb-3 text-sm text-gray-600">Dang tai devices...</p>}
              {devicesError && <p className="mb-3 text-sm text-red-500">{devicesError}</p>}
              <DeviceGrid devices={deviceList} onToggle={handleToggleDevice} />
            </Card>
          ) : (
            <Card className="bg-[#ece6f8] p-4">
              {devicesLoading && <p className="mb-3 text-sm text-gray-600">Dang tai devices...</p>}
              {devicesError && <p className="mb-3 text-sm text-red-500">{devicesError}</p>}
              <div className="overflow-x-auto">
                <table className="min-w-full rounded-xl bg-white text-sm text-[#1d1645]">
                  <thead>
                    <tr className="border-b border-[#e8def8] text-left">
                      <th className="px-4 py-3 font-semibold">Device</th>
                      <th className="px-4 py-3 font-semibold">Type</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                      <th className="px-4 py-3 font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deviceList.map((device) => (
                      <tr key={device.id} className="border-b border-[#f2ecfb] last:border-b-0">
                        <td className="px-4 py-3 font-medium">{device.name}</td>
                        <td className="px-4 py-3 capitalize">{device.type}</td>
                        <td className="px-4 py-3 uppercase">{device.status}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => handleToggleDevice(device.id)}
                              className="rounded-lg bg-[#d8c7f4] px-3 py-1.5 text-xs font-semibold text-[#1d1645] transition hover:bg-[#c9b2ef]"
                            >
                              Toggle
                            </button>
                            <button
                              onClick={() => handleModifyDevice(device.id)}
                              className="rounded-lg bg-[#efe7ff] px-3 py-1.5 text-xs font-semibold text-[#1d1645] transition hover:bg-[#e1d3ff]"
                            >
                              Modify
                            </button>
                            <button
                              onClick={() => handleDeleteDevice(device.id)}
                              className="rounded-lg bg-[#ffd9d9] px-3 py-1.5 text-xs font-semibold text-[#8a1f1f] transition hover:bg-[#ffc3c3]"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
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

