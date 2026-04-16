import { NavLink, Navigate, useParams, useNavigate, useLocation } from "react-router-dom";
import { useMemo, useState, useEffect } from "react";
import Card from "../components/ui/Card";
import DeviceGrid from "../components/device/DeviceGrid";
import TemperatureWidget from "../components/device/TemperatureWidget";
import HumidityWidget from "../components/device/HumidityWidget";
import { useDeviceData } from "../hooks/deviceHook";

const DEVICE_VIEW_TABS = [
  { key: "card", label: "Card form" },
  { key: "list", label: "List form" },
];

const DEVICE_VIEW_PREF_KEY = "smartwarehouse.device-view-preference";
const DEVICE_SORT_PREF_KEY = "smartwarehouse.device-sort-preference";

const Devices = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { view = "card" } = useParams();
  const normalizedView = String(view).toLowerCase();
  const isCardView = normalizedView === "card";
  const isListView = normalizedView === "list";

  // Save view preference when it changes
  useEffect(() => {
    if ((isCardView || isListView) && typeof window !== "undefined") {
      window.localStorage.setItem(DEVICE_VIEW_PREF_KEY, normalizedView);
    }
  }, [normalizedView, isCardView, isListView]);

  // Load and restore saved view preference
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const saved = window.localStorage.getItem(DEVICE_VIEW_PREF_KEY);
      // If no view specified in URL (defaults to card) and we have a saved preference that's different, navigate to it
      if (view === "card" && saved && saved !== "card") {
        navigate(
          {
            pathname: `/devices/${saved}`,
            search: location.search,
          },
          { replace: true },
        );
      } else if (!view || view === "card") {
        // Ensure we're always on a valid view
        const preferredView = saved || "card";
        if (preferredView !== "card") {
          navigate(
            {
              pathname: `/devices/${preferredView}`,
              search: location.search,
            },
            { replace: true },
          );
        }
      }
    } catch (_) {
      // Silently fail
    }
  }, [view, navigate, location.search]);
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

  // Initialize sort config from localStorage
  const [sortConfig, setSortConfig] = useState(() => {
    if (typeof window === "undefined") {
      return { key: "deviceName", direction: "asc" };
    }
    try {
      const saved = window.localStorage.getItem(DEVICE_SORT_PREF_KEY);
      return saved ? JSON.parse(saved) : { key: "deviceName", direction: "asc" };
    } catch (_) {
      return { key: "deviceName", direction: "asc" };
    }
  });

  // Save sort config to localStorage when it changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(DEVICE_SORT_PREF_KEY, JSON.stringify(sortConfig));
    }
  }, [sortConfig]);

  const temp = Number(payload?.data?.temperature?.[0]?.value ?? 30).toFixed(2);
  const hum = Number(payload?.data?.humidity?.[0]?.value ?? 30).toFixed(2);

  const getDeviceNameValue = (device) => String(device.deviceName || device.name || "").toLowerCase();

  const sortedDeviceList = useMemo(() => {
    const list = [...deviceList];

    list.sort((a, b) => {
      let aValue;
      let bValue;

      if (sortConfig.key === "deviceName") {
        aValue = getDeviceNameValue(a);
        bValue = getDeviceNameValue(b);
      } else if (sortConfig.key === "type") {
        aValue = String(a.type || "").toLowerCase();
        bValue = String(b.type || "").toLowerCase();
      } else if (sortConfig.key === "status") {
        aValue = String(a.status || "").toLowerCase();
        bValue = String(b.status || "").toLowerCase();
      } else {
        aValue = "";
        bValue = "";
      }

      if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;

      const aId = Number(a.deviceId);
      const bId = Number(b.deviceId);
      if (Number.isFinite(aId) && Number.isFinite(bId) && aId !== bId) {
        return sortConfig.direction === "asc" ? aId - bId : bId - aId;
      }

      return 0;
    });

    return list;
  }, [deviceList, sortConfig]);

  const handleSort = (key) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        return { key, direction: prev.direction === "asc" ? "desc" : "asc" };
      }
      return { key, direction: "asc" };
    });
  };

  const sortArrow = (key) => {
    if (sortConfig.key !== key) return "↕";
    return sortConfig.direction === "asc" ? "↑" : "↓";
  };

  if (!isCardView && !isListView) {
    return (
      <Navigate
        to={{
          pathname: "/devices/card",
          search: location.search,
        }}
        replace
      />
    );
  }

  return (
    <section>
      {/* Navbar */}
      <div className="mb-3 inline-flex rounded-xl bg-[#b7afe6] p-1">
        {DEVICE_VIEW_TABS.map((tab) => (
          <NavLink
            key={tab.key}
            to={{
              pathname: `/devices/${tab.key}`,
              search: location.search,
            }}
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
                      <th className="px-4 py-3 font-semibold">
                        <button
                          type="button"
                          onClick={() => handleSort("deviceName")}
                          className="inline-flex items-center gap-1"
                        >
                          Device Name <span className="text-lg font-bold leading-none">{sortArrow("deviceName")}</span>
                        </button>
                      </th>
                      <th className="px-4 py-3 font-semibold">
                        <button
                          type="button"
                          onClick={() => handleSort("type")}
                          className="inline-flex items-center gap-1"
                        >
                          Type <span className="text-lg font-bold leading-none">{sortArrow("type")}</span>
                        </button>
                      </th>
                      <th className="px-4 py-3 font-semibold">
                        <button
                          type="button"
                          onClick={() => handleSort("status")}
                          className="inline-flex items-center gap-1"
                        >
                          Status <span className="text-lg font-bold leading-none">{sortArrow("status")}</span>
                        </button>
                      </th>
                      <th className="px-4 py-3 font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedDeviceList.map((device) => (
                      <tr key={device.id} className="border-b border-[#f2ecfb] last:border-b-0">
                        <td className="px-4 py-3 font-medium">
                          {(device.deviceName || device.name || "N/A")}
                          {device.deviceId !== undefined && device.deviceId !== null
                            ? `_${device.deviceId}`
                            : ""}
                        </td>
                        <td className="px-4 py-3 capitalize">{device.type}</td>
                        {/* <td className="px-4 py-3 uppercase">{device.status}</td> */}
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold uppercase ${
                            device.status === 'on' 
                              ? 'bg-green-200 text-green-700' 
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {device.status}
                          </span>
                        </td>
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

