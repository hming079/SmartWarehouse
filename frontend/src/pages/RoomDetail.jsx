import { useMemo, useEffect, useState } from "react";
import { Bot, CalendarClock, ChevronLeft, ClipboardList, Droplets, Power, RefreshCw, Thermometer, Trash2, TriangleAlert } from "lucide-react";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useDeviceData } from "../hooks/roomDetail/deviceRoomDetail";
import { api } from "../api";
import {
  useRoomDetail,
  DAY_OPTIONS,
  ACTION_OPTIONS,
  COMPARE_OPTIONS,
  formatValue,
  getStatusText,
  formatDateTime,
  normalizeBoolean,
  toNumberOrNull,
  isTelemetryDevice,
} from "../hooks/roomDetail/useRoomDetail";
import Modal from "../components/ui/Modal";

const RANGE_OPTIONS = [
  { value: "24h", label: "24 hours" },
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
];

const METRIC_OPTIONS = [
  { value: "temperature", label: "Temperature" },
  { value: "humidity", label: "Humidity" },
];

const DEVICE_TYPE_OPTIONS = [
  { value: "fan", label: "Fan" },
  { value: "dryer", label: "Dryer" },
  { value: "ac", label: "AC / Cooling" },
  { value: "lights", label: "Lights" },
];

function formatTimestamp(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString();
}

function getFoodTypeIcon(foodTypeName) {
  const normalized = String(foodTypeName || "").toLowerCase();
  if (normalized.includes("thịt") || normalized.includes("thit") || normalized.includes("bò") || normalized.includes("bo") || normalized.includes("gà") || normalized.includes("ga")) return "🥩";
  if (normalized.includes("rau")) return "🥕";
  if (normalized.includes("hải sản") || normalized.includes("hai san") || normalized.includes("cá") || normalized.includes("ca")) return "🐟";
  if (normalized.includes("sữa") || normalized.includes("sua")) return "🥛";
  if (normalized.includes("trái cây") || normalized.includes("trai cay")) return "🍎";
  if (normalized.includes("nước") || normalized.includes("nuoc") || normalized.includes("đồ uống") || normalized.includes("do uong")) return "🥤";
  if (normalized.includes("khô") || normalized.includes("kho")) return "📦";
  return "🍽️";
}

function TimeseriesChart({ points, metric }) {
  const width = 720;
  const height = 240;
  const padding = 24;

  const chart = useMemo(() => {
    if (!Array.isArray(points) || points.length === 0) {
      return { path: "", circles: [], min: 0, max: 0 };
    }

    const values = points.map((point) => Number(point.value || 0));
    const min = Math.min(...values);
    const max = Math.max(...values);
    const diff = max - min || 1;

    const xStep = points.length > 1 ? (width - padding * 2) / (points.length - 1) : 0;

    const circles = points.map((point, index) => {
      const x = padding + index * xStep;
      const y = height - padding - ((Number(point.value || 0) - min) / diff) * (height - padding * 2);
      return { ...point, x, y };
    });

    const path = circles
      .map((point, index) => `${index === 0 ? "M" : "L"}${point.x},${point.y}`)
      .join(" ");

    return { path, circles, min, max };
  }, [points]);

  const unit = metric === "humidity" ? "%" : "°C";

  if (!points?.length) {
    return <div className="rounded-xl bg-white p-6 text-sm text-gray-500">No data in selected range.</div>;
  }

  return (
    <div className="overflow-x-auto rounded-xl bg-white p-4">
      <svg viewBox={`0 0 ${width} ${height}`} className="min-w-[520px]">
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#d1d5db" />
        <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="#d1d5db" />
        <path d={chart.path} fill="none" stroke="#6c4fd3" strokeWidth="3" strokeLinecap="round" />
        {chart.circles.map((point, index) => (
          <circle key={index} cx={point.x} cy={point.y} r="3.5" fill="#6c4fd3">
            <title>{`${formatTimestamp(point.timestamp)}: ${Number(point.value || 0).toFixed(2)} ${unit}`}</title>
          </circle>
        ))}
        <text x={padding + 4} y={padding + 12} fill="#6b7280" fontSize="12">{`${chart.max.toFixed(2)} ${unit}`}</text>
        <text x={padding + 4} y={height - padding - 6} fill="#6b7280" fontSize="12">{`${chart.min.toFixed(2)} ${unit}`}</text>
      </svg>
    </div>
  );
}

const RoomDetail = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { roomId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();

  const searchRoomId = Number(searchParams.get("roomId"));
  const routeRoomId = Number(roomId);
  const selectedRoomId = Number.isInteger(routeRoomId) && routeRoomId > 0
    ? routeRoomId
    : Number.isInteger(searchRoomId) && searchRoomId > 0
      ? searchRoomId
      : null;

  const { payload, loading, error, deviceList, devicesLoading, devicesError, pendingControlIds, handleToggleDevice, handleAddDevice, handleDeleteDevice } = useDeviceData({ roomIdOverride: selectedRoomId });

  // Business logic hook
  const {
    automationItems,
    automationForm,
    automationFormError,
    isAutomationModalOpen,
    quickRuleName,
    quickRuleThreshold,
    setAutomationForm,
    setAutomationFormError,
    setIsAutomationModalOpen,
    setQuickRuleName,
    setQuickRuleThreshold,
    handleToggleAutomation,
    handleDeleteAutomation,
    handleCreateQuickAutomation,
    openAutomationModal,
    handleSubmitAutomation,
    openEditAutomationModal,
    automationEditingId,
    setAutomationEditingId,
    schedulesItems,
    scheduleForm,
    scheduleFormError,
    scheduleEditingId,
    isScheduleModalOpen,
    scheduleFilter,
    scheduleDeviceOptions,
    filteredSchedules,
    setScheduleForm,
    setScheduleFormError,
    setScheduleEditingId,
    setIsScheduleModalOpen,
    setScheduleFilter,
    toggleScheduleDay,
    toggleScheduleDevice,
    handleToggleSchedule,
    handleDeleteSchedule,
    openCreateScheduleForm,
    openEditScheduleForm,
    handleSubmitSchedule,
    auditItems,
    auditActionFilter,
    expandedAuditId,
    filteredAuditItems,
    setAuditActionFilter,
    handleExpandAudit,
    handleExportAudit,
    alertsItems,
    alertsFilter,
    alertsSeverityFilter,
    expandedAlertId,
    filteredAlerts,
    setAlertsFilter,
    setAlertsSeverityFilter,
    setExpandedAlertId,
    handleResolveAlert,
    handleAcknowledgeAlert,
    metaLoading,
    metaError,
    metaInfo,
    busyKey,
    setMetaError,
    reloadRoomMeta,
  } = useRoomDetail(selectedRoomId, payload);

  const stateRoom = location.state?.room;
  const stateFloor = location.state?.floor;
  const stateZone = location.state?.zone;

  const roomMatchesSelection = stateRoom && selectedRoomId && Number(stateRoom.room_id || stateRoom.id) === selectedRoomId;
  const roomTitle = roomMatchesSelection ? stateRoom.name : `Phong ${selectedRoomId || roomId}`;
  const roomDescription = roomMatchesSelection ? stateRoom.description : "Theo doi trang thai nhiet do, do am va thiet bi trong phong.";
  const roomFoodTypeName = roomMatchesSelection ? stateRoom.food_type_name : "";
  const roomFoodTypeIcon = getFoodTypeIcon(roomFoodTypeName);
  const selectedAreaId = searchParams.get("areaId") || "";
  const selectedFloorId = searchParams.get("floorId") || "";
  const [metric, setMetric] = useState("temperature");
  const [range, setRange] = useState("24h");
  const [selectedDeviceType, setSelectedDeviceType] = useState("fan");
  const [deviceFilterText, setDeviceFilterText] = useState("");
  const [deviceFilterStatus, setDeviceFilterStatus] = useState("all");
  const [timeseries, setTimeseries] = useState([]);
  const [timeseriesLoading, setTimeseriesLoading] = useState(false);
  const [timeseriesError, setTimeseriesError] = useState("");

  const temperatureValue = toNumberOrNull(payload?.data?.temperature?.[0]?.value);
  const humidityValue = toNumberOrNull(payload?.data?.humidity?.[0]?.value);

  const controlDevices = useMemo(
    () => deviceList.filter((device) => !isTelemetryDevice(device)),
    [deviceList],
  );

  const filteredControlDevices = useMemo(() => {
    const normalizedText = deviceFilterText.trim().toLowerCase();

    return controlDevices.filter((device) => {
      const status = String(device.status || "").toLowerCase();
      const name = String(device.name || "").toLowerCase();
      const identifier = String(device.deviceId ?? device.id ?? "").toLowerCase();

      const matchesText = !normalizedText
        || name.includes(normalizedText)
        || identifier.includes(normalizedText)
        || status.includes(normalizedText);

      const matchesStatus = deviceFilterStatus === "all" || status === deviceFilterStatus;

      return matchesText && matchesStatus;
    });
  }, [controlDevices, deviceFilterText, deviceFilterStatus]);

  const activeCount = controlDevices.filter((item) => String(item.status || "").toLowerCase() === "on").length;
  const totalCount = controlDevices.length;

  const latestUpdateTime = useMemo(() => {
    const times = filteredAuditItems
      .map((item) => new Date(item.timestamp).getTime())
      .filter((value) => Number.isFinite(value));
    if (!times.length) return null;
    return new Date(Math.max(...times));
  }, [filteredAuditItems]);

  const sensorReadings = useMemo(() => {
    const temperatureEntry = payload?.data?.temperature?.[0] || null;
    const humidityEntry = payload?.data?.humidity?.[0] || null;

    return [
      {
        key: "temperature",
        label: "Nhiệt độ",
        unit: "°C",
        value: toNumberOrNull(temperatureEntry?.value),
        thresholdMin: payload?.threshold?.temperature?.min,
        thresholdMax: payload?.threshold?.temperature?.max,
        updatedAt: temperatureEntry?.ts,
      },
      {
        key: "humidity",
        label: "Độ ẩm",
        unit: "%",
        value: toNumberOrNull(humidityEntry?.value),
        thresholdMin: payload?.threshold?.humidity?.min,
        thresholdMax: payload?.threshold?.humidity?.max,
        updatedAt: humidityEntry?.ts,
      },
    ];
  }, [payload]);

  const roomAwareAutomation = useMemo(() => {
    const zoneName = String(stateZone?.name || "").trim().toLowerCase();
    const roomName = String(stateRoom?.name || roomTitle || "").trim().toLowerCase();
    const roomIdText = selectedRoomId ? String(selectedRoomId) : "";

    return automationItems
      .map((rule) => ({
        ...rule,
        is_active: normalizeBoolean(rule.is_active),
        apply_to: String(rule.apply_to || ""),
        displayCondition: `${rule.metric || ""} ${rule.compare_op || ""} ${rule.threshold_value ?? ""}`.trim(),
      }))
      .filter((rule) => {
        const targetRaw = String(rule.apply_to || "").trim();
        const target = targetRaw.toLowerCase();
        if (!target) return false;

        // Support rules targeting by room id (exact) and by room/zone name (contains)
        const idMatched = roomIdText && targetRaw === roomIdText;
        const nameMatched = (roomName && target.includes(roomName)) || (zoneName && target.includes(zoneName));
        return Boolean(idMatched || nameMatched);
      });
  }, [automationItems, stateZone?.name, stateRoom?.name, roomTitle, selectedRoomId]);

  const activeAutomationCount = roomAwareAutomation.filter((item) => item.is_active).length;

  const groupedAuditItems = useMemo(() => {
    const groups = new Map();

    filteredAuditItems.forEach((item) => {
      const rawDeviceId = item.deviceId ?? item.device_id ?? item.id;
      const normalizedDeviceId = rawDeviceId === undefined || rawDeviceId === null ? "--" : String(rawDeviceId);
      const type = String(item.type || "unknown").toLowerCase();
      const key = `${type}#${normalizedDeviceId}`;

      if (!groups.has(key)) {
        groups.set(key, {
          key,
          type,
          deviceId: normalizedDeviceId,
          roomName: item.room_name || "Unknown Room",
          logs: [],
        });
      }

      groups.get(key).logs.push(item);
    });

    return Array.from(groups.values());
  }, [filteredAuditItems]);

  const handleBack = () => {
    navigate({
      pathname: "/area",
      search: location.search,
    });
  };

  const handleOpenDashboard = () => {
    if (!selectedRoomId) {
      navigate("/dashboard");
      return;
    }
    navigate(`/dashboard?roomId=${selectedRoomId}`);
  };

  useEffect(() => {
    if (!selectedRoomId) return;
    if (searchRoomId === selectedRoomId) return;

    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("roomId", String(selectedRoomId));
    setSearchParams(nextParams, { replace: true });
  }, [searchRoomId, selectedRoomId, searchParams, setSearchParams]);

  useEffect(() => {
    let canceled = false;

    const loadTimeseries = async () => {
      if (!selectedRoomId) {
        setTimeseries([]);
        return;
      }

      try {
        setTimeseriesLoading(true);
        setTimeseriesError("");
        const response = await api.getDashboardTimeseries({ roomId: selectedRoomId, metric, range });
        if (canceled) return;
        setTimeseries(response?.data?.points || []);
      } catch (err) {
        if (!canceled) {
          setTimeseries([]);
          setTimeseriesError(err.message || "Khong the tai du lieu graph");
        }
      } finally {
        if (!canceled) {
          setTimeseriesLoading(false);
        }
      }
    };

    loadTimeseries();
    return () => {
      canceled = true;
    };
  }, [selectedRoomId, metric, range]);

  return (
    <section className="min-h-[80vh] rounded-3xl bg-white/10 dark:bg-slate-900/50 backdrop-blur-md border border-white/20 p-4 text-slate-900 dark:text-white shadow-2xl md:p-6 relative overflow-hidden">
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div className="absolute top-0 -left-20 w-72 h-72 rounded-full bg-blue-500/30 blur-[100px]" />
        <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full bg-indigo-500/20 blur-[100px]" />
      </div>
      <div className="relative mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <button
            onClick={handleBack}
            className="mb-3 inline-flex items-center gap-2 rounded-lg border border-blue-400/30 bg-blue-500/10 px-3 py-1.5 text-sm text-slate-900 dark:text-white transition hover:bg-blue-500/20"
          >
            <ChevronLeft size={16} /> Quay lai Area
          </button>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{roomTitle}</h1>
          <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
            {stateZone?.name || `Khu vuc ${searchParams.get("areaId") || "--"}`} • {stateFloor?.floor_number ? `Tang ${stateFloor.floor_number}` : `Tang ${searchParams.get("floorId") || "--"}`} • {roomDescription}
          </p>
        </div>

        <span className="rounded-full border border-emerald-500/30 bg-emerald-500/20 px-3 py-1 text-sm font-semibold text-emerald-300">Hoat dong</span>
      </div>

      {roomFoodTypeName ? (
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-400/30 bg-blue-500/10 px-3 py-1 text-sm text-blue-900 dark:text-blue-100">
          <span className="text-base" aria-hidden="true">{roomFoodTypeIcon}</span>
          <span>Loại thực phẩm: {roomFoodTypeName}</span>
        </div>
      ) : null}

      {(error || devicesError) && (
        <div className="mb-4 rounded-xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-900 dark:text-red-200 backdrop-blur">{error || devicesError}</div>
      )}
      {metaError && <div className="mb-4 rounded-xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-900 dark:text-red-200 backdrop-blur">{metaError}</div>}
      {metaInfo && <div className="mb-4 rounded-xl border border-emerald-400/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-900 dark:text-emerald-200 backdrop-blur">{metaInfo}</div>}

      {(loading || devicesLoading) && <p className="mb-4 text-sm text-slate-900 dark:text-blue-300">Dang tai du lieu phong...</p>}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <div className="rounded-2xl border border-blue-400/30 bg-white/10 dark:bg-slate-900/40 backdrop-blur p-4 text-center transition hover:border-blue-400/50 hover:shadow-lg shadow-lg">
          <Thermometer className="mx-auto mb-2 text-blue-600 dark:text-blue-400" size={22} />
          <p className="text-4xl font-bold text-slate-900 dark:text-white">{formatValue(temperatureValue, "°C")}</p>
          <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">Nhiệt độ hiện tại</p>
        </div>

        <div className="rounded-2xl border border-indigo-400/30 bg-white/10 dark:bg-slate-900/40 backdrop-blur p-4 text-center transition hover:border-indigo-400/50 hover:shadow-lg shadow-lg">
          <Droplets className="mx-auto mb-2 text-indigo-600 dark:text-indigo-400" size={22} />
          <p className="text-4xl font-bold text-slate-900 dark:text-white">{formatValue(humidityValue, "%")}</p>
          <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">Độ ẩm hiện tại</p>
        </div>

        {/* <div className="rounded-2xl border border-amber-400/20 bg-[#071a3f]/70 p-4 text-center">
          <TriangleAlert className="mx-auto mb-2 text-amber-300" size={22} />
          <p className="text-2xl font-bold text-amber-200">{formatValue(payload?.threshold?.temperature?.min, "°C")} ~ {formatValue(payload?.threshold?.temperature?.max, "°C")}</p>
          <p className="mt-1 text-sm text-[#89a5d8]">Ngưỡng nhiệt độ</p>
        </div> */}

        <div className="rounded-2xl border border-blue-400/30 bg-white/10 dark:bg-slate-900/40 backdrop-blur p-4 text-center transition hover:border-blue-400/50 hover:shadow-lg shadow-lg">
          <Power className="mx-auto mb-2 text-blue-600 dark:text-blue-400" size={22} />
          <p className="text-3xl font-bold text-slate-900 dark:text-white">{activeCount}/{totalCount}</p>
          <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">Thiết bị đang bật</p>
        </div>
      </div>

      <div className="mt-5 space-y-4 rounded-2xl border border-blue-400/30 bg-white/10 dark:bg-slate-900/40 backdrop-blur p-4 shadow-lg">
        <div className="grid grid-cols-1 gap-4">
          <div className="space-y-3 rounded-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur p-4 xl:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-700 dark:text-blue-400">Trend Graph</h3>
              <div className="flex items-center gap-2">
                <select
                  className="rounded-lg border border-blue-300/40 bg-white/50 dark:bg-slate-900/50 backdrop-blur px-2 py-1 text-xs text-slate-900 dark:text-slate-300 dark:border-blue-400/30"
                  value={metric}
                  onChange={(event) => setMetric(event.target.value)}
                >
                  {METRIC_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <select
                  className="rounded-lg border border-blue-300/40 bg-white/50 dark:bg-slate-900/50 backdrop-blur px-2 py-1 text-xs text-slate-900 dark:text-slate-300 dark:border-blue-400/30"
                  value={range}
                  onChange={(event) => setRange(event.target.value)}
                >
                  {RANGE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {timeseriesError ? <p className="rounded-lg bg-red-50 dark:bg-red-500/10 px-3 py-2 text-xs text-red-600 dark:text-red-300">{timeseriesError}</p> : null}
            {timeseriesLoading ? <p className="text-xs text-gray-500">Loading graph...</p> : <TimeseriesChart points={timeseries} metric={metric} />}
          </div>
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-blue-400/30 bg-white/10 dark:bg-slate-900/40 backdrop-blur p-4 shadow-lg">
        <h2 className="mb-3 text-lg font-semibold text-slate-900 dark:text-white">Thiết bị trong phòng</h2>

        <div className="mb-5">
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="text-xs uppercase tracking-wider text-slate-700 dark:text-blue-300">Thông tin cảm biến</p>
            <span className="text-xs text-slate-700 dark:text-slate-300">{sensorReadings.length} cảm biến</span>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {sensorReadings.map((sensor) => {
              const hasValue = sensor.value !== null;
              const thresholdText =
                sensor.thresholdMin !== undefined || sensor.thresholdMax !== undefined
                  ? `${formatValue(sensor.thresholdMin, sensor.unit)} ~ ${formatValue(sensor.thresholdMax, sensor.unit)}`
                  : "--";

              return (
                <div key={sensor.key} className="rounded-xl border border-blue-400/30 bg-white/10 dark:bg-slate-800/40 backdrop-blur px-3 py-3 transition hover:border-blue-400/50">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{sensor.label}</p>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${hasValue ? "bg-blue-500/30 text-slate-900 dark:text-blue-200 border border-blue-400/30" : "bg-white/10 text-slate-700 dark:text-white/60 border border-white/20"}`}>
                      {hasValue ? "Đang cập nhật" : "Không có dữ liệu"}
                    </span>
                  </div>
                  <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">{formatValue(sensor.value, sensor.unit)}</p>
                  {/* <p className="mt-1 text-xs text-[#8ea9d8]">Ngưỡng: {thresholdText}</p> */}
                  <p className="mt-1 text-xs text-slate-700 dark:text-slate-300">Cập nhật: {formatDateTime(sensor.updatedAt)}</p>
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-xs uppercase tracking-wider text-slate-700 dark:text-blue-300">
              Thiet bi dieu khien ({filteredControlDevices.length}/{controlDevices.length})
            </p>
            <div className="flex items-center gap-2">
              <input
                value={deviceFilterText}
                onChange={(event) => setDeviceFilterText(event.target.value)}
                placeholder="Filter by name/id/status"
                className="w-44 rounded-lg border border-blue-400/30 bg-white/10 dark:bg-slate-900/40 backdrop-blur px-2 py-1 text-xs text-slate-900 dark:text-white placeholder:text-slate-600 dark:placeholder:text-blue-200/50 outline-none transition focus:border-blue-400/60"
              />
              <select
                value={deviceFilterStatus}
                onChange={(event) => setDeviceFilterStatus(event.target.value)}
                className="rounded-lg border border-blue-400/30 bg-white/10 dark:bg-slate-900/40 backdrop-blur px-2 py-1 text-xs text-slate-900 dark:text-white outline-none transition focus:border-blue-400/60"
              >
                <option value="all">All status</option>
                <option value="on">On</option>
                <option value="off">Off</option>
              </select>
              <select
                value={selectedDeviceType}
                onChange={(event) => setSelectedDeviceType(event.target.value)}
                className="rounded-lg border border-blue-400/30 bg-white/10 dark:bg-slate-900/40 backdrop-blur px-2 py-1 text-xs text-slate-900 dark:text-white outline-none transition focus:border-blue-400/60"
              >
                {DEVICE_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => handleAddDevice(selectedDeviceType)}
                className="rounded-lg bg-emerald-500/30 border border-emerald-400/30 px-2.5 py-1 text-xs font-semibold text-emerald-900 dark:text-emerald-200 transition hover:bg-emerald-500/40 hover:border-emerald-400/50"
              >
                + Add Device
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {controlDevices.length === 0 && <p className="text-sm text-slate-700 dark:text-slate-300">Chua co thiet bi dieu khien.</p>}
            {controlDevices.length > 0 && filteredControlDevices.length === 0 && (
              <p className="text-sm text-slate-700 dark:text-slate-300">Khong tim thay thiet bi phu hop bo loc.</p>
            )}
            {filteredControlDevices.map((device) => (
              <div key={device.id} className="flex items-center justify-between rounded-xl border border-blue-400/30 bg-white/10 dark:bg-slate-800/40 backdrop-blur px-3 py-2.5 transition hover:border-blue-400/50">
                <div className="min-w-0 pr-2">
                  <p className="truncate text-sm font-medium text-slate-900 dark:text-white">{device.name + "_" + device.deviceId}</p>
                  <p className="text-xs text-slate-700 dark:text-slate-300">{getStatusText(device.status)}</p>
                  {device.setupDescription ? (
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-300">
                      {device.setupDescription}
                    </p>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleDeleteDevice(device.id)}
                    className="inline-flex items-center gap-1 rounded bg-rose-500/30 border border-rose-400/30 px-2 py-1 text-xs font-semibold text-rose-900 dark:text-rose-200 transition hover:bg-rose-500/40 hover:border-rose-400/50"
                  >
                    <Trash2 size={12} /> Delete
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleDevice(device.id)}
                    disabled={pendingControlIds.includes(device.id)}
                    className={`h-6 w-10 rounded-full border p-1 transition ${device.status === "on" ? "border-blue-300/40 bg-blue-500" : "border-slate-500/70 bg-slate-700/70 shadow-inner shadow-black/20"} ${pendingControlIds.includes(device.id) ? "cursor-not-allowed opacity-60" : ""}`}
                  >
                    <span className={`block h-4 w-4 rounded-full bg-white transition ${device.status === "on" ? "translate-x-4" : "translate-x-0"}`} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4">
        <div className="rounded-2xl border border-blue-400/30 bg-white/10 dark:bg-slate-900/40 backdrop-blur p-4 shadow-lg">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Bot size={18} className="text-blue-600 dark:text-blue-400" />
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Automation</h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={reloadRoomMeta}
                disabled={metaLoading}
                className="rounded-lg bg-blue-500/20 border border-blue-400/30 p-1.5 text-blue-900 dark:text-blue-200 transition hover:bg-blue-500/30 hover:border-blue-400/50 disabled:cursor-not-allowed disabled:opacity-60"
                title="Lam moi"
              >
                <RefreshCw size={14} />
              </button>
              <button
                onClick={openAutomationModal}
                className="rounded-lg bg-emerald-500/30 border border-emerald-400/30 px-3 py-1.5 text-xs font-semibold text-emerald-900 dark:text-emerald-200 transition hover:bg-emerald-500/40 hover:border-emerald-400/50"
              >
                + Create
              </button>
            </div>
          </div>

          {metaLoading ? <p className="text-sm text-slate-700 dark:text-slate-300">Dang tai...</p> : null}

          <div className="space-y-2">
            {roomAwareAutomation.slice(0, 8).map((rule) => (
              <div key={rule.rule_id} className="rounded-xl border border-blue-400/30 bg-white/10 dark:bg-slate-800/40 backdrop-blur px-3 py-2 transition hover:border-blue-400/50">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{rule.name || `Rule ${rule.rule_id}`}</p>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-bold border ${rule.is_active ? "bg-emerald-500/30 text-emerald-950 border-emerald-400/30 dark:text-emerald-100" : "bg-slate-200/20 text-slate-900 border-slate-300/30 dark:text-slate-200 dark:bg-slate-500/15 dark:border-slate-400/25"}`}>
                    {rule.is_active ? "Active" : "Off"}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-700 dark:text-slate-300">{rule.displayCondition || "No condition"}</p>
                <p className="mt-1 text-xs text-slate-700 dark:text-slate-300">Ap dung: {rule.apply_to || "--"} • Alert: {rule.alert_level || "--"}</p>
                <p className="mt-1 text-xs text-slate-700 dark:text-slate-300">Action: {rule.action_name || "--"}</p>
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => openEditAutomationModal(rule)}
                    className="rounded bg-blue-500/20 border border-blue-400/30 px-2 py-1 text-xs font-semibold text-blue-900 dark:text-blue-200 transition hover:bg-blue-500/30 hover:border-blue-400/50"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleToggleAutomation(rule.rule_id)}
                    disabled={busyKey === `automation-toggle-${rule.rule_id}`}
                    className="rounded bg-indigo-500/20 border border-indigo-400/30 px-2 py-1 text-xs font-semibold text-indigo-900 dark:text-indigo-200 transition hover:bg-indigo-500/30 hover:border-indigo-400/50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {busyKey === `automation-toggle-${rule.rule_id}` ? "..." : "Toggle"}
                  </button>
                  <button
                    onClick={() => handleDeleteAutomation(rule.rule_id)}
                    disabled={busyKey === `automation-delete-${rule.rule_id}`}
                    className="rounded bg-rose-500/20 border border-rose-400/30 px-2 py-1 text-xs font-semibold text-rose-900 dark:text-rose-200 transition hover:bg-rose-500/30 hover:border-rose-400/50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <span className="inline-flex items-center gap-1"><Trash2 size={12} /> Delete</span>
                  </button>
                </div>
              </div>
            ))}
            {!metaLoading && roomAwareAutomation.length === 0 ? <p className="text-sm text-slate-700 dark:text-slate-300">Chua co quy tac automation.</p> : null}
          </div>
        </div>

        <div className="rounded-2xl border border-indigo-400/30 bg-white/10 dark:bg-slate-900/40 backdrop-blur p-4 shadow-lg">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <CalendarClock size={18} className="text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Schedules</h3>
            </div>
            <button
              onClick={openCreateScheduleForm}
              className="rounded-lg bg-emerald-500/30 border border-emerald-400/30 px-3 py-1.5 text-xs font-semibold text-emerald-900 dark:text-emerald-200 transition hover:bg-emerald-500/40 hover:border-emerald-400/50"
            >
              + Create
            </button>
          </div>

          <div className="mb-3 inline-flex overflow-hidden rounded-lg border border-indigo-400/30 text-xs">
            {[
              { key: "all", label: "All" },
              { key: "active", label: "Active" },
              { key: "inactive", label: "Inactive" },
            ].map((item) => (
              <button
                key={item.key}
                onClick={() => setScheduleFilter(item.key)}
                className={`px-2 py-1.5 transition ${scheduleFilter === item.key ? "bg-indigo-500/30 text-indigo-900 dark:text-indigo-200 border-r border-indigo-400/30" : "bg-white/10 text-slate-700 dark:text-slate-300 border-r border-indigo-400/20"}`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            {filteredSchedules.slice(0, 8).map((item) => (
              <div key={item.id} className="rounded-xl border border-indigo-400/30 bg-white/10 dark:bg-slate-800/40 backdrop-blur px-3 py-2 transition hover:border-indigo-400/50">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{item.name || `Schedule ${item.id}`}</p>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-bold border ${item.is_active ? "bg-emerald-500/30 text-emerald-950 border-emerald-400/30 dark:text-emerald-100" : "bg-slate-200/20 text-slate-900 border-slate-300/30 dark:text-slate-200 dark:bg-slate-500/15 dark:border-slate-400/25"}`}>
                    {item.is_active ? "Active" : "Off"}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-700 dark:text-slate-300">{item.start_time?.slice(0, 5) || "--:--"} - {item.end_time?.slice(0, 5) || "--:--"} | {item.days_of_week || "No days"}</p>
                <p className="mt-1 text-xs text-slate-700 dark:text-slate-300">Action: {item.action || "--"}</p>
                <p className="mt-1 text-xs text-slate-700 dark:text-slate-300">Devices: {item.device_names || "--"}</p>
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => openEditScheduleForm(item)}
                    className="rounded bg-indigo-500/20 border border-indigo-400/30 px-2 py-1 text-xs font-semibold text-indigo-900 dark:text-indigo-200 transition hover:bg-indigo-500/30 hover:border-indigo-400/50"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleToggleSchedule(item.id)}
                    disabled={busyKey === `schedule-toggle-${item.id}`}
                    className="rounded bg-indigo-500/20 border border-indigo-400/30 px-2 py-1 text-xs font-semibold text-indigo-900 dark:text-indigo-200 transition hover:bg-indigo-500/30 hover:border-indigo-400/50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {busyKey === `schedule-toggle-${item.id}` ? "..." : "Toggle"}
                  </button>
                  <button
                    onClick={() => handleDeleteSchedule(item.id)}
                    disabled={busyKey === `schedule-delete-${item.id}`}
                    className="rounded bg-rose-500/20 border border-rose-400/30 px-2 py-1 text-xs font-semibold text-rose-900 dark:text-rose-200 transition hover:bg-rose-500/30 hover:border-rose-400/50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <span className="inline-flex items-center gap-1"><Trash2 size={12} /> Delete</span>
                  </button>
                </div>
              </div>
            ))}
            {!metaLoading && filteredSchedules.length === 0 ? <p className="text-sm text-slate-700 dark:text-slate-300">Chua co lich tu dong cho phong nay.</p> : null}
          </div>
        </div>

        <div className="rounded-2xl border border-amber-400/30 bg-white/10 dark:bg-slate-900/40 backdrop-blur p-4 shadow-lg">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <TriangleAlert size={18} className="text-amber-400" />
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Alerts</h3>
            </div>
            <button
              onClick={reloadRoomMeta}
              disabled={metaLoading}
              className="rounded-lg bg-amber-500/20 border border-amber-400/30 p-1.5 text-amber-900 dark:text-amber-200 transition hover:bg-amber-500/30 hover:border-amber-400/50 disabled:cursor-not-allowed disabled:opacity-60"
              title="Refresh alerts"
            >
              <RefreshCw size={14} />
            </button>
          </div>

          <div className="mb-4 flex flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-900 dark:text-amber-200">Status:</span>
              <select
                value={alertsFilter}
                onChange={(event) => setAlertsFilter(event.target.value)}
                className="rounded-lg border border-amber-400/30 bg-white/10 dark:bg-slate-900/40 backdrop-blur px-2 py-1 text-xs text-slate-900 dark:text-white outline-none transition focus:border-amber-400/60"
              >
                <option value="all">All</option>
                <option value="open">Open</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-900 dark:text-amber-200">Severity:</span>
              <select
                value={alertsSeverityFilter}
                onChange={(event) => setAlertsSeverityFilter(event.target.value)}
                className="rounded-lg border border-amber-400/30 bg-white/10 dark:bg-slate-900/40 backdrop-blur px-2 py-1 text-xs text-slate-900 dark:text-white outline-none transition focus:border-amber-400/60"
              >
                <option value="all">All</option>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            {filteredAlerts.length === 0 && !metaLoading ? (
              <p className="rounded-lg bg-emerald-500/20 border border-emerald-400/30 px-3 py-2 text-sm text-emerald-900 dark:text-emerald-200">No alerts for this room.</p>
            ) : null}

            {filteredAlerts.map((alert) => {
              const isExpanded = expandedAlertId === alert.id;
              const isResolved = alert.status === "RESOLVED" || alert.is_resolved;
              const severityColor = alert.severity === "HIGH" ? "border-rose-400/40 bg-rose-500/15" : alert.severity === "MEDIUM" ? "border-amber-400/40 bg-amber-500/15" : "border-blue-400/40 bg-blue-500/15";
              const severityTextColor = alert.severity === "HIGH" ? "text-rose-900 dark:text-rose-200" : alert.severity === "MEDIUM" ? "text-amber-900 dark:text-amber-200" : "text-blue-900 dark:text-blue-200";

              return (
                <div key={alert.id} className={`rounded-xl border p-3 transition backdrop-blur ${severityColor}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className={`text-sm font-semibold ${severityTextColor}`}>{alert.severity || "LOW"}</p>
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold border ${isResolved ? "bg-emerald-500/30 text-slate-900 dark:text-emerald-200 border-emerald-400/30" : "bg-yellow-500/30 text-slate-900 dark:text-yellow-200 border-yellow-400/30"}`}>
                          {isResolved ? "RESOLVED" : "OPEN"}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-slate-900 dark:text-white">{alert.message || "Alert triggered"}</p>
                      <p className="mt-1 text-xs text-slate-700 dark:text-slate-300">Triggered: {formatDateTime(alert.timestamp)}</p>
                      {alert.triggered_value && (
                        <p className="mt-1 text-xs text-slate-700 dark:text-slate-300">Value: {Number(alert.triggered_value).toFixed(2)}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setExpandedAlertId(isExpanded ? null : alert.id)}
                        className="rounded bg-white/20 border border-white/30 px-2 py-1 text-[10px] font-semibold text-slate-900 dark:text-white transition hover:bg-white/30"
                      >
                        {isExpanded ? "Hide" : "Show"}
                      </button>
                      {!isResolved && (
                        <button
                          type="button"
                          onClick={() => handleResolveAlert(alert.id)}
                          disabled={busyKey === `alert-resolve-${alert.id}`}
                          className="rounded bg-emerald-500/30 border border-emerald-400/30 px-2 py-1 text-[10px] font-semibold text-emerald-900 dark:text-emerald-200 transition hover:bg-emerald-500/40 hover:border-emerald-400/50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {busyKey === `alert-resolve-${alert.id}` ? "..." : "Resolve"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-blue-400/30 bg-white/10 dark:bg-slate-900/40 backdrop-blur p-4 shadow-lg">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <ClipboardList size={18} className="text-blue-600 dark:text-blue-400" />
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Device logs</h3>
            </div>
            <button
              onClick={handleExportAudit}
              disabled={busyKey === "audit-export"}
              className="rounded-lg bg-blue-500/30 border border-blue-400/30 px-3 py-1.5 text-xs font-semibold text-blue-200 transition hover:bg-blue-500/40 hover:border-blue-400/50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busyKey === "audit-export" ? "Dang export..." : "Export CSV"}
            </button>
          </div>

          <div className="mb-2 rounded-lg border border-blue-400/30 bg-white/10 dark:bg-slate-800/40 backdrop-blur px-3 py-2 text-xs text-slate-700 dark:text-slate-300">
            Area {selectedAreaId || "--"} | Floor {selectedFloorId || "--"} | Room {selectedRoomId || "--"}
          </div>

          {metaLoading ? <p className="text-sm text-slate-700 dark:text-slate-300">Dang tai...</p> : null}

          <input
            value={auditActionFilter}
            onChange={(event) => setAuditActionFilter(event.target.value)}
            placeholder="Loc theo type, id, status"
            className="mb-2 w-full rounded-lg border border-blue-400/30 bg-white/10 dark:bg-slate-900/40 backdrop-blur px-2 py-1.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-600 dark:placeholder:text-blue-200/50 outline-none transition focus:border-blue-400/60"
          />

          <div className="space-y-2">
            {groupedAuditItems.slice(0, 12).map((group) => {
              const latest = group.logs[0];
              return (
                <div key={group.key} className="rounded-xl border border-blue-400/30 bg-white/10 dark:bg-slate-800/40 backdrop-blur overflow-hidden">
                  <button
                    onClick={() => handleExpandAudit(group.key)}
                    className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left transition hover:bg-white/10"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{group.type} #{group.deviceId}</p>
                      <p className="truncate text-[11px] text-slate-700 dark:text-slate-300">{group.roomName} • {group.logs.length} logs</p>
                    </div>
                    <div className="text-right text-[11px] text-slate-700 dark:text-slate-300">
                      <p className="font-semibold text-slate-900 dark:text-white">{latest?.status || "--"}</p>
                      <p>{formatDateTime(latest?.timestamp)}</p>
                    </div>
                  </button>

                  {expandedAuditId === group.key ? (
                    <div className="border-t border-blue-400/20 bg-white/5 px-3 py-2">
                      <div className="space-y-1 text-xs text-slate-700 dark:text-slate-300">
                        {group.logs.slice(0, 10).map((log) => (
                          <div key={log.id} className="flex items-center justify-between gap-2 rounded-md bg-white/10 px-2 py-1">
                            <span className="font-medium text-slate-900 dark:text-white">{log.status || "--"}</span>
                            <span className="text-slate-700 dark:text-slate-300">{formatDateTime(log.timestamp)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
            {!metaLoading && groupedAuditItems.length === 0 ? <p className="text-sm text-slate-700 dark:text-slate-300">Chua co device log cho phong nay.</p> : null}
          </div>
        </div>
      </div>

      <Modal isOpen={isAutomationModalOpen} onClose={() => { setIsAutomationModalOpen(false); setAutomationEditingId(null); }}>
        <div className="space-y-4 max-w-2xl">
          <div>
            <h3 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-500 bg-clip-text text-transparent">Create automation rule</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">Create the rule without leaving this room page.</p>
          </div>

          {automationFormError ? <div className="rounded-xl bg-rose-50 dark:bg-rose-500/10 px-3 py-2 text-sm text-rose-700 dark:text-rose-300">{automationFormError}</div> : null}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Rule name
              <input
                value={automationForm.name}
                onChange={(event) => setAutomationForm((prev) => ({ ...prev, name: event.target.value }))}
                className="mt-2 w-full rounded-xl border border-blue-300/40 bg-white/80 dark:bg-slate-800/50 backdrop-blur px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
                placeholder="Temperature high alert"
              />
            </label>

            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Apply to
              <input
                value={roomTitle}
                disabled
                className="mt-2 w-full rounded-xl border border-slate-300/40 bg-slate-100 dark:bg-slate-900/50 px-3 py-2 text-sm text-slate-500 dark:text-slate-400 outline-none"
              />
            </label>

            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Metric
              <select
                value={automationForm.metric}
                onChange={(event) => setAutomationForm((prev) => ({ ...prev, metric: event.target.value }))}
                className="mt-2 w-full rounded-xl border border-blue-300/40 bg-white/80 dark:bg-slate-800/50 backdrop-blur px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
              >
                <option value="Temperature">Temperature</option>
                <option value="Humidity">Humidity</option>
              </select>
            </label>

            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Compare
              <select
                value={automationForm.compare_op}
                onChange={(event) => setAutomationForm((prev) => ({ ...prev, compare_op: event.target.value }))}
                className="mt-2 w-full rounded-xl border border-blue-300/40 bg-white/80 dark:bg-slate-800/50 backdrop-blur px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
              >
                {COMPARE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Threshold
              <input
                value={automationForm.threshold_value}
                onChange={(event) => setAutomationForm((prev) => ({ ...prev, threshold_value: event.target.value }))}
                className="mt-2 w-full rounded-xl border border-blue-300/40 bg-white/80 dark:bg-slate-800/50 backdrop-blur px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
                placeholder="30"
              />
            </label>

            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Alert level
              <select
                value={automationForm.alert_level}
                onChange={(event) => setAutomationForm((prev) => ({ ...prev, alert_level: event.target.value }))}
                className="mt-2 w-full rounded-xl border border-blue-300/40 bg-white/80 dark:bg-slate-800/50 backdrop-blur px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </label>

            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 md:col-span-2">
              Action type
              <select
                value={automationForm.actionType || (automationForm.action_name ? "action" : "alert")}
                onChange={event => {
                  const value = event.target.value;
                  setAutomationForm(prev => ({
                    ...prev,
                    actionType: value,
                    action_name: value === "alert" ? "" : prev.action_name,
                  }));
                }}
                className="mt-2 w-full rounded-xl border border-blue-300/40 bg-white/80 dark:bg-slate-800/50 backdrop-blur px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
              >
                <option value="action">Kích hoạt thiết bị</option>
                <option value="alert">Chỉ cảnh báo</option>
              </select>
            </label>

            {automationForm.actionType !== "alert" && (
              <>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Action
                  <select
                    value={automationForm.actionOnOff || "on"}
                    onChange={e => {
                      const value = e.target.value;
                      setAutomationForm(prev => ({
                        ...prev,
                        actionOnOff: value,
                        action_name: `${value === "on" ? "Bật" : "Tắt"} ${prev.actionDeviceType ? prev.actionDeviceType : ""} ${prev.actionDeviceId ? `#${prev.actionDeviceId}` : ""}`.trim(),
                      }));
                    }}
                    className="mt-2 w-full rounded-xl border border-blue-300/40 bg-white/80 dark:bg-slate-800/50 backdrop-blur px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
                  >
                    <option value="on">Bật (Turn on)</option>
                    <option value="off">Tắt (Turn off)</option>
                  </select>
                </label>

                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Device type
                  <select
                    value={automationForm.actionDeviceType || "fan"}
                    onChange={e => {
                      const value = e.target.value;
                      setAutomationForm(prev => ({
                        ...prev,
                        actionDeviceType: value,
                        actionDeviceId: "", // reset device selection when type changes
                        action_name: `${prev.actionOnOff === "off" ? "Tắt" : "Bật"} ${value}`.trim(),
                      }));
                    }}
                    className="mt-2 w-full rounded-xl border border-blue-300/40 bg-white/80 dark:bg-slate-800/50 backdrop-blur px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
                  >
                    {DEVICE_TYPE_OPTIONS.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>

                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 md:col-span-2">
                  Devices
                  <select
                    multiple
                    value={automationForm.actionDeviceIds || []}
                    onChange={e => {
                      const selected = Array.from(e.target.selectedOptions).map(opt => opt.value);
                      setAutomationForm(prev => ({
                        ...prev,
                        actionDeviceIds: selected,
                        action_name: `${prev.actionOnOff === "off" ? "Tắt" : "Bật"} ${prev.actionDeviceType ? prev.actionDeviceType : ""} ${selected.map(id => `#${id}`).join(",")}`.trim(),
                      }));
                    }}
                    className="mt-2 w-full rounded-xl border border-blue-300/40 bg-white/80 dark:bg-slate-800/50 backdrop-blur px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition h-28"
                  >
                    {controlDevices
                      .filter(d => (automationForm.actionDeviceType ? d.type === automationForm.actionDeviceType : true))
                      .map(device => (
                        <option key={device.deviceId || device.id} value={device.deviceId || device.id}>{device.name} (ID: {device.deviceId || device.id})</option>
                      ))}
                  </select>
                  <span className="block text-xs text-slate-500 dark:text-slate-400 mt-1">(Giữ Ctrl/Command để chọn nhiều thiết bị)</span>
                </label>
              </>
            )}
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsAutomationModalOpen(false)}
              className="rounded-xl bg-slate-200 dark:bg-slate-700 px-5 py-2 font-semibold text-slate-900 dark:text-white hover:bg-slate-300 dark:hover:bg-slate-600 transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                let payload = { ...automationForm };
                if (automationForm.actionType === "alert") {
                  payload = { ...payload, action_name: "", actionDeviceIds: [], actionDeviceTypes: [] };
                } else {
                  payload = {
                    ...payload,
                    action_name: automationForm.action_name,
                    action_device_ids: (automationForm.actionDeviceIds || []).join(","),
                    action_device_types: automationForm.actionDeviceType ? automationForm.actionDeviceType : "",
                  };
                }
                if (automationEditingId) {
                  // Edit mode
                  payload.rule_id = automationEditingId;
                  handleSubmitAutomation(roomTitle, payload, true); // true = edit
                } else {
                  handleSubmitAutomation(roomTitle, payload);
                }
              }}
              disabled={busyKey === "automation-create"}
              className="rounded-xl bg-blue-600 hover:bg-blue-700 px-5 py-2 font-semibold text-white transition shadow-lg shadow-blue-500/25 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busyKey === "automation-create" ? (automationEditingId ? "Saving..." : "Saving...") : (automationEditingId ? "Save changes" : "Save")}
            </button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={isScheduleModalOpen} onClose={() => setIsScheduleModalOpen(false)}>
        <form className="space-y-4 max-w-2xl" onSubmit={(event) => { event.preventDefault(); handleSubmitSchedule(); }}>
          <div>
            <h3 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-blue-500 bg-clip-text text-transparent">{scheduleEditingId ? "Edit schedule" : "Create schedule"}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">Manage recurring actions directly from this room.</p>
          </div>

          {scheduleFormError ? <div className="rounded-xl bg-rose-50 dark:bg-rose-500/10 px-3 py-2 text-sm text-rose-700 dark:text-rose-300">{scheduleFormError}</div> : null}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 md:col-span-2">
              Schedule name
              <input
                value={scheduleForm.name}
                onChange={(event) => setScheduleForm((prev) => ({ ...prev, name: event.target.value }))}
                className="mt-2 w-full rounded-xl border border-indigo-300/40 bg-white/80 dark:bg-slate-800/50 backdrop-blur px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition"
                placeholder="Night cooling"
              />
            </label>

            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Start time
              <input
                type="time"
                value={scheduleForm.start_time}
                onChange={(event) => setScheduleForm((prev) => ({ ...prev, start_time: event.target.value }))}
                className="mt-2 w-full rounded-xl border border-indigo-300/40 bg-white/80 dark:bg-slate-800/50 backdrop-blur px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition"
              />
            </label>

            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              End time
              <input
                type="time"
                value={scheduleForm.end_time}
                onChange={(event) => setScheduleForm((prev) => ({ ...prev, end_time: event.target.value }))}
                className="mt-2 w-full rounded-xl border border-indigo-300/40 bg-white/80 dark:bg-slate-800/50 backdrop-blur px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition"
              />
            </label>

            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 md:col-span-2">
              Action
              <select
                value={scheduleForm.action}
                onChange={(event) => setScheduleForm((prev) => ({ ...prev, action: event.target.value }))}
                className="mt-2 w-full rounded-xl border border-indigo-300/40 bg-white/80 dark:bg-slate-800/50 backdrop-blur px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition"
              >
                {ACTION_OPTIONS.map((action) => (
                  <option key={action} value={action}>
                    {action}
                  </option>
                ))}
              </select>
            </label>

            <div className="md:col-span-2">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Days of week</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {DAY_OPTIONS.map((day) => {
                  const selected = scheduleForm.days.includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleScheduleDay(day)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${selected ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/25 border border-indigo-500/50" : "bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-slate-100 hover:bg-slate-300 dark:hover:bg-slate-600 border border-slate-300 dark:border-slate-600"}`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="md:col-span-2">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Devices</p>
              <div className="mt-2 grid max-h-52 grid-cols-1 gap-2 overflow-auto sm:grid-cols-2">
                {scheduleDeviceOptions.length === 0 ? (
                  <p className="text-sm text-slate-500 dark:text-slate-400">No devices found for this room.</p>
                ) : (
                  scheduleDeviceOptions.map((device) => {
                    const id = Number(device.id);
                    const selected = scheduleForm.device_ids.includes(id);
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => toggleScheduleDevice(id)}
                        className={`rounded-lg border px-3 py-2 text-left text-xs font-medium transition ${selected ? "border-indigo-400/60 bg-indigo-50 dark:bg-indigo-500/20 text-indigo-900 dark:text-indigo-100 shadow-lg shadow-indigo-500/10" : "border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"}`}
                      >
                        {device.name + "_" + device.id}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsScheduleModalOpen(false)}
              className="rounded-xl bg-slate-200 dark:bg-slate-700 px-5 py-2 font-semibold text-slate-900 dark:text-white hover:bg-slate-300 dark:hover:bg-slate-600 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busyKey === "schedule-submit"}
              className="rounded-xl bg-indigo-600 hover:bg-indigo-700 px-5 py-2 font-semibold text-white transition shadow-lg shadow-indigo-500/25 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busyKey === "schedule-submit" ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </Modal>
    </section>
  );
};

export default RoomDetail;
