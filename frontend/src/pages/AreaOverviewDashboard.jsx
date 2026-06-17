import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { 
  ChevronRight, 
  MapPin, 
  Plus, 
  Edit2, 
  Trash2, 
  Thermometer, 
  Droplets, 
  Power, 
  AlertTriangle,
  LayoutGrid,
  DoorOpen
} from "lucide-react";
import { api } from "../api";
import { getFoodTypeDisplay } from "../utils/foodTypes";
import { useDeviceData } from "../hooks/roomDetail/deviceRoomDetail"; // Đảm bảo đường dẫn đúng
import { useRoomDetail, formatValue, toNumberOrNull, isTelemetryDevice } from "../hooks/roomDetail/useRoomDetail";

const LOCATION_ID = 1;

// Component hiển thị Card cho từng phòng
const RoomSummaryCard = ({ room, onClick }) => {
  // Tái sử dụng logic lấy dữ liệu thiết bị và chi tiết phòng
  const { payload, deviceList, loading: devicesLoading } = useDeviceData({ roomIdOverride: room.room_id });
  const { alertsItems, metaLoading } = useRoomDetail(room.room_id, payload);
  
  // Trích xuất dữ liệu cảm biến
  const temperatureValue = toNumberOrNull(payload?.data?.temperature?.[0]?.value);
  const humidityValue = toNumberOrNull(payload?.data?.humidity?.[0]?.value);

  // Tính toán thiết bị và cảnh báo
  const openAlertsCount = alertsItems.filter((item) => !(item.status === "RESOLVED" || item.is_resolved)).length;
  
  const controlDevices = useMemo(() => deviceList.filter((d) => !isTelemetryDevice(d)), [deviceList]);
  const activeDeviceCount = controlDevices.filter((d) => String(d.status || "").toLowerCase() === "on").length;
  const totalDeviceCount = controlDevices.length;
  
  const telemetryDevices = useMemo(() => deviceList.filter(isTelemetryDevice), [deviceList]);

  // Tính công suất giả định (dựa trên số thiết bị đang bật / tổng số)
  const capacityPercent = totalDeviceCount > 0 ? Math.round((activeDeviceCount / totalDeviceCount) * 100) : 0;

  return (
    <div 
      onClick={() => onClick(room)}
      className="flex flex-col rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all hover:shadow-md hover:border-blue-200 cursor-pointer"
    >
      {/* Header Card */}
      <div className="flex items-start justify-between mb-1">
        <div className="flex items-center gap-2">
          <DoorOpen className="text-blue-500" size={20} />
          <h3 className="text-lg font-bold text-gray-900">{room.name}</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
            Hoạt động
          </span>
          <ChevronRight size={18} className="text-gray-400" />
        </div>
      </div>
      <p className="text-sm text-gray-500 mb-4">{room.food_type_name + getFoodTypeDisplay(room.food_type_name).icon || room.description || "Chưa phân loại"}</p>

      {/* Thông số chính */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="rounded-xl bg-gray-50/80 p-3 text-center">
          <p className="text-2xl font-bold text-blue-600">
            {formatValue(temperatureValue, "°C")}
          </p>
          <p className="text-xs text-gray-500 mt-1">Nhiệt độ</p>
        </div>
        <div className="rounded-xl bg-gray-50/80 p-3 text-center">
          <p className="text-2xl font-bold text-blue-600">
            {formatValue(humidityValue, "%")}
          </p>
          <p className="text-xs text-gray-500 mt-1">Độ ẩm</p>
        </div>
        <div className="rounded-xl bg-gray-50/80 p-3 text-center">
          <p className={`text-2xl font-bold ${openAlertsCount > 0 ? "text-amber-500" : "text-gray-700"}`}>
            {openAlertsCount}
          </p>
          <p className="text-xs text-gray-500 mt-1">Cảnh báo</p>
        </div>
      </div>

      {/* Danh sách thiết bị */}
      <div className="flex-1 rounded-xl border border-gray-100 bg-gray-50/50 p-4">
        <p className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wider">
          Thiết bị ({activeDeviceCount}/{totalDeviceCount} Hoạt động)
        </p>
        <div className="space-y-2">
          {devicesLoading ? (
            <p className="text-xs text-gray-400">Đang tải thiết bị...</p>
          ) : (
            <>
              {/* Hiển thị cảm biến trước */}
              {telemetryDevices.slice(0, 2).map((device, idx) => (
                <div key={`tel-${idx}`} className="flex justify-between items-center text-sm">
                  <div className="flex items-center gap-2 text-gray-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    <Thermometer size={14} className="text-gray-400"/>
                    <span className="truncate">{device.name || "Cảm biến"}</span>
                  </div>
                  <span className="text-blue-600 font-medium text-xs">
                     {String(device.type).toLowerCase() === 'temperature' ? formatValue(temperatureValue, "°C") : formatValue(humidityValue, "%")}
                  </span>
                </div>
              ))}
              {/* Hiển thị thiết bị điều khiển */}
              {controlDevices.slice(0, 3).map((device) => {
                const isOn = String(device.status || "").toLowerCase() === "on";
                return (
                  <div key={device.id} className="flex justify-between items-center text-sm">
                    <div className="flex items-center gap-2 text-gray-700">
                      <span className={`w-1.5 h-1.5 rounded-full ${isOn ? "bg-emerald-500" : "bg-gray-300"}`}></span>
                      <Power size={14} className="text-gray-400"/>
                      <span className="truncate w-32">{device.name}</span>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>

      {/* Footer - Công suất */}
      <div className="mt-4">
        <div className="flex justify-between text-xs text-gray-500 mb-1.5">
          <span>Công suất: {capacityPercent}%</span>
          <span>{totalDeviceCount} thiết bị</span>
        </div>
        <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
          <div 
            className="h-full bg-blue-500 rounded-full transition-all duration-500" 
            style={{ width: `${capacityPercent}%` }}
          />
        </div>
      </div>
    </div>
  );
};

// Component chính
const AreaOverviewDashboard = () => {
  const navigate = useNavigate();
  const [zones, setZones] = useState([]);
  const [selectedZone, setSelectedZone] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [floors, setFloors] = useState([]);
  const [loading, setLoading] = useState(false);

  // Tải danh sách Khu vực
  useEffect(() => {
    const fetchZones = async () => {
      try {
        const res = await api.getZones(LOCATION_ID);
        setZones(res.data || []);
        if (res.data && res.data.length > 0) {
          handleSelectZone(res.data[0]); // Mặc định chọn khu vực đầu tiên
        }
      } catch (err) {
        console.error("Lỗi tải khu vực:", err);
      }
    };
    fetchZones();
  }, []);

  // Lấy tất cả phòng trong một Khu vực (Bằng cách lấy tất cả các tầng -> các phòng)
  const handleSelectZone = async (zone) => {
    setSelectedZone(zone);
    setLoading(true);
    try {
      const floorsRes = await api.getFloors(zone.zone_id);
      const floors = floorsRes.data || [];
      
      // Lấy danh sách phòng cho tất cả các tầng thuộc khu vực này
      const roomPromises = floors.map(floor => api.getRooms(floor.floor_id));
      const roomsResponses = await Promise.all(roomPromises);
      
      // Gộp tất cả phòng lại thành 1 mảng
      const allRooms = roomsResponses.reduce((acc, curr) => acc.concat(curr.data || []), []);
      setRooms(allRooms);
    } catch (err) {
      console.error("Lỗi tải danh sách phòng:", err);
    } finally {
      setLoading(false);
    }
  };


const handleNavigateToRoom = (room) => {
  // 1. Tìm đối tượng tầng (floor) tương ứng với room.floor_id
  const matchingFloor = floors.find(f => f.floor_id === room.floor_id);

  // 2. Khởi tạo và thiết lập các Query Parameters đúng chuẩn
  const params = new URLSearchParams();
  params.set("roomId", String(room.room_id));

  if (selectedZone?.zone_id) {
    params.set("areaId", String(selectedZone.zone_id));
  }

  if (room.floor_id) {
    params.set("floorId", String(room.floor_id));
  }

  // 3. Tiến hành điều hướng kèm theo cả thanh URL mới và dữ liệu state đầy đủ
  navigate(
    {
      pathname: `/rooms/${room.room_id}`,
      search: `?${params.toString()}`,
    },
    {
      state: {
        room,
        floor: matchingFloor, // Truyền đúng object tầng đã tìm thấy
        zone: selectedZone,
      },
    }
  );
};
  return (
    <div className="min-h-screen bg-slate-50 p-6 font-sans">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#24124d]">Khu vực & Phòng bảo quản</h1>
          <p className="text-sm text-gray-500 mt-1">Xem tổng quan khu vực bảo quản và các phòng — bấm vào phòng để xem chi tiết</p>
        </div>
        {/* <button className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 shadow-sm">
          <Plus size={18} /> Thêm phòng
        </button> */}
      </div>

      {/* Control Bar: Selector & Actions */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex items-center gap-2">
          <LayoutGrid className="text-blue-500" size={20} />
          <span className="text-gray-700 font-medium">Khu vực:</span>
        </div>
        
        <div className="relative w-72">
          <select
            className="w-full appearance-none rounded-lg border border-gray-200 bg-white px-4 py-2.5 pr-10 text-sm text-gray-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            value={selectedZone?.zone_id || ""}
            onChange={(e) => {
              const zone = zones.find(z => z.zone_id === Number(e.target.value));
              if (zone) handleSelectZone(zone);
            }}
          >
            {zones.map(zone => (
              <option key={zone.zone_id} value={zone.zone_id}>
                {zone.name}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
            <ChevronRight size={16} className="rotate-90" />
          </div>
        </div>

        {/* <button className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 transition">
          <Plus size={18} />
        </button>
        <button className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 transition">
          <Edit2 size={18} />
        </button>
        <button className="flex h-10 w-10 items-center justify-center rounded-lg border border-red-100 bg-white text-red-500 hover:bg-red-50 transition">
          <Trash2 size={18} />
        </button> */}
      </div>

      {/* Bảng tóm tắt Khu vực */}
      <div className="mb-6 flex items-center gap-4 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <MapPin className="text-gray-400" size={20} />
        <span className="text-sm font-medium text-gray-700 mr-4">
          {selectedZone?.description || "Khu bảo quản hải sản tươi sống và đông lạnh"}
        </span>
        <div className="h-4 w-px bg-gray-200"></div>
        <span className="text-sm font-medium text-blue-600">{rooms.length} phòng</span>
        <div className="h-4 w-px bg-gray-200"></div>
        <span className="text-sm font-medium text-indigo-500">Đang đồng bộ thiết bị...</span>
        <div className="h-4 w-px bg-gray-200"></div>
        <span className="text-sm font-medium text-amber-500">Đang quét cảnh báo...</span>
      </div>

      {/* Grid danh sách các phòng */}
      {loading ? (
        <div className="py-10 text-center text-gray-500">Đang tải dữ liệu các phòng...</div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {rooms.map(room => (
            <RoomSummaryCard 
              key={room.room_id} 
              room={room} 
              onClick={handleNavigateToRoom} 
            />
          ))}
          {rooms.length === 0 && (
            <div className="col-span-full rounded-xl border border-dashed border-gray-300 p-10 text-center text-gray-500">
              Không có phòng nào trong khu vực này.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AreaOverviewDashboard;