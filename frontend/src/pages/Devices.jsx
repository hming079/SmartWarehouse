import React, { useState } from "react";
import { NavLink, Navigate, useParams } from "react-router-dom";
import Card from "../components/ui/Card";
import DeviceGrid from "../components/device/DeviceGrid";
import TemperatureWidget from "../components/device/TemperatureWidget";
import HumidityWidget from "../components/device/HumidityWidget";
import OverviewACWidget from "../components/device/OverviewACWidget";
import DeviceImageCard from "../components/device/DeviceImageCard";
import Toggle from "../components/ui/Toggle";
import { useDeviceData } from "../hooks/deviceHook";
import { summary, devices as devicesMock } from "../constants/mockData";

const DEVICE_VIEW_TABS = [
  { key: "overview", label: "Tổng quan" },
  { key: "list", label: "Danh sách" },
  { key: "card", label: "Thẻ" },
];

const Devices = () => {
  const { view = "overview" } = useParams();
  const normalizedView = String(view).toLowerCase();
  const isOverviewView = normalizedView === "overview";
  const isListView = normalizedView === "list";
  const isCardView = normalizedView === "card";
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
  } = useDeviceData();

  const [acOn, setAcOn] = useState(true);

  if (!isOverviewView && !isListView && !isCardView) {
    return <Navigate to="/devices/overview" replace />;
  }

  const temp = Number(payload?.data?.temperature?.[0]?.value ?? 30).toFixed(2);
  const hum = Number(payload?.data?.humidity?.[0]?.value ?? 30).toFixed(2);

  const displayDevices = deviceList && deviceList.length > 0 ? deviceList : devicesMock;
  const activeCount = displayDevices.filter((d) => d.status === "on" || d.status === true).length;

  return (
    <section>
      {/* Navbar & Actions */}
      <div className="mb-6 flex items-center justify-between">
        <div className="inline-flex rounded-2xl bg-[#d8ccfa] p-1">
          {DEVICE_VIEW_TABS.map((tab) => (
            <NavLink
              key={tab.key}
              to={`/devices/${tab.key}`}
              className={({ isActive }) =>
                `rounded-xl px-6 py-2 text-lg font-bold transition ${
                  isActive ? "bg-white text-black shadow-sm" : "text-black"
                }`
              }
            >
              {tab.label}
            </NavLink>
          ))}
        </div>
        {(isListView || isCardView) && (
          <button className="rounded-xl bg-[#d8ccfa] px-6 py-3 font-bold text-black transition hover:bg-[#c6bbef]">
            + Thêm thiết bị
          </button>
        )}
      </div>
      {/* Content */}
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Main Content Area */}
        <div className="flex-1 space-y-6">
          {devicesLoading && <p className="text-sm text-gray-600">Đang tải thiết bị...</p>}
          {devicesError && <p className="text-sm text-red-500">Lỗi kết nối API, đang hiển thị dữ liệu mẫu.</p>}
          
          {isOverviewView && (
            <div className="space-y-6">
              <OverviewACWidget temperature={Math.ceil(temp)} isOn={acOn} onToggle={() => setAcOn(!acOn)} />
              <DeviceGrid devices={displayDevices.slice(0, 4)} onToggle={handleToggleDevice} />
            </div>
          )}

          {isListView && (
            <div className="overflow-x-auto rounded-xl border border-[#f0f0f0] bg-[#f9f9fb] p-2">
              <table className="min-w-full text-sm text-gray-800 bg-[#f9f9fb]">
                <thead>
                  <tr className="border-b border-[#e5e5e5] text-left text-gray-500">
                    <th className="px-6 py-4 font-semibold whitespace-nowrap">Mã thiết bị</th>
                    <th className="px-6 py-4 font-semibold whitespace-nowrap">Tên thiết bị</th>
                    <th className="px-6 py-4 font-semibold whitespace-nowrap">Loại thiết bị</th>
                    <th className="px-6 py-4 font-semibold whitespace-nowrap">Trạng thái</th>
                    <th className="px-6 py-4 font-semibold whitespace-nowrap">Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {displayDevices.map((device) => (
                    <tr key={device.id} className="border-b border-[#f0f0f0] last:border-0 hover:bg-gray-50 transition">
                      <td className="px-6 py-4 font-medium">
                        <div className="flex items-center gap-4">
                          <Toggle checked={device.status === "on" || device.status === true} onChange={() => handleToggleDevice(device.id)} />
                          {device.id}
                        </div>
                      </td>
                      <td className="px-6 py-4">{device.name}</td>
                      <td className="px-6 py-4 capitalize">
                        {device.type === "auto" ? "Tự động" : device.type === "control" ? "Điều khiển" : device.type}
                      </td>
                      <td className="px-6 py-4">
                        {device.status === "on" || device.status === true ? "Đang hoạt động" : "Tắt"}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-4">
                          <button
                            onClick={() => handleModifyDevice(device.id)}
                            className="flex items-center gap-1 text-[#6b7280] transition hover:text-black"
                          >
                            <span>✎</span> Sửa
                          </button>
                          <button
                            onClick={() => handleDeleteDevice(device.id)}
                            className="flex items-center gap-1 text-[#6b7280] transition hover:text-red-500"
                          >
                            <span>🗑</span> Xóa
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {isCardView && (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {displayDevices.map((device) => (
                <DeviceImageCard
                  key={device.id}
                  device={device}
                  onEdit={() => handleModifyDevice(device.id)}
                  onDelete={() => handleDeleteDevice(device.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Right col - Sensor values */}
        <div className="w-full lg:w-[350px] shrink-0 space-y-6">
          {loading && <p className="text-sm text-gray-500">Đang tải telemetry...</p>}
          <TemperatureWidget temperature={temp} />
          <HumidityWidget humidity={hum} />
          
          <Card className="flex flex-col items-center justify-center bg-[#fcfafd] p-8 text-center border border-[#f2eefb]">
            <p className="mb-2 text-xl font-medium text-black">Active/All</p>
            <p className="text-5xl font-bold text-gray-500">
              <span className="text-black">{activeCount}</span>/{displayDevices.length || summary.totalDevices}
            </p>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default Devices;

