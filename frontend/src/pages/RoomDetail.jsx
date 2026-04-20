import { useMemo, useEffect, useState } from "react";
import { Bot, CalendarClock, ChevronLeft, ClipboardList, Droplets, Power, RefreshCw, Thermometer, Trash2, TriangleAlert } from "lucide-react";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useDeviceData } from "../hooks/deviceHook";
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
} from "../hooks/useRoomDetail";
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

function formatTimestamp(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString();
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
  const selectedAreaId = searchParams.get("areaId") || "";
  const selectedFloorId = searchParams.get("floorId") || "";
  const [metric, setMetric] = useState("temperature");
  const [range, setRange] = useState("24h");
  const [timeseries, setTimeseries] = useState([]);
  const [timeseriesLoading, setTimeseriesLoading] = useState(false);
  const [timeseriesError, setTimeseriesError] = useState("");

  const temperatureValue = toNumberOrNull(payload?.data?.temperature?.[0]?.value);
  const humidityValue = toNumberOrNull(payload?.data?.humidity?.[0]?.value);

  const controlDevices = useMemo(
    () => deviceList.filter((device) => !isTelemetryDevice(device)),
    [deviceList],
  );

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
    const zoneName = String(stateZone?.name || "").toLowerCase();
    const roomName = String(roomTitle || "").toLowerCase();

    const normalized = automationItems.map((rule) => ({
      ...rule,
      is_active: normalizeBoolean(rule.is_active),
      apply_to: String(rule.apply_to || ""),
      displayCondition: `${rule.metric || ""} ${rule.compare_op || ""} ${rule.threshold_value ?? ""}`.trim(),
    }));

    const scoped = normalized.filter((rule) => {
      const target = String(rule.apply_to || "").toLowerCase();
      if (!target) return false;
      if (zoneName && target.includes(zoneName)) return true;
      if (roomName && target.includes(roomName)) return true;
      return false;
    });

    return scoped;
  }, [automationItems, stateZone?.name, roomTitle]);

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
    <section className="min-h-[80vh] rounded-3xl bg-gradient-to-b from-[#04122f] via-[#031129] to-[#020b1b] p-4 text-white shadow-2xl md:p-6">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <button
            onClick={handleBack}
            className="mb-3 inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/5 px-3 py-1.5 text-sm text-white/80 transition hover:bg-white/10"
          >
            <ChevronLeft size={16} /> Quay lai Area
          </button>
          <h1 className="text-3xl font-bold text-white">{roomTitle}</h1>
          <p className="mt-1 text-sm text-[#88a2cf]">
            {stateZone?.name || `Khu vuc ${searchParams.get("areaId") || "--"}`} • {stateFloor?.floor_number ? `Tang ${stateFloor.floor_number}` : `Tang ${searchParams.get("floorId") || "--"}`} • {roomDescription}
          </p>
        </div>

        <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-sm font-semibold text-emerald-300">Hoat dong</span>
      </div>

      {(error || devicesError) && (
        <div className="mb-4 rounded-xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error || devicesError}</div>
      )}
      {metaError && <div className="mb-4 rounded-xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">{metaError}</div>}
      {metaInfo && <div className="mb-4 rounded-xl border border-emerald-400/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{metaInfo}</div>}

      {(loading || devicesLoading) && <p className="mb-4 text-sm text-[#8aa3ce]">Dang tai du lieu phong...</p>}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <div className="rounded-2xl border border-cyan-400/20 bg-[#071a3f]/70 p-4 text-center">
          <Thermometer className="mx-auto mb-2 text-cyan-300" size={22} />
          <p className="text-4xl font-bold text-cyan-300">{formatValue(temperatureValue, "°C")}</p>
          <p className="mt-1 text-sm text-[#89a5d8]">Nhiệt độ hiện tại</p>
        </div>

        <div className="rounded-2xl border border-teal-400/20 bg-[#071a3f]/70 p-4 text-center">
          <Droplets className="mx-auto mb-2 text-teal-300" size={22} />
          <p className="text-4xl font-bold text-teal-300">{formatValue(humidityValue, "%")}</p>
          <p className="mt-1 text-sm text-[#89a5d8]">Độ ẩm hiện tại</p>
        </div>

        <div className="rounded-2xl border border-amber-400/20 bg-[#071a3f]/70 p-4 text-center">
          <TriangleAlert className="mx-auto mb-2 text-amber-300" size={22} />
          <p className="text-2xl font-bold text-amber-200">{formatValue(payload?.threshold?.temperature?.min, "°C")} ~ {formatValue(payload?.threshold?.temperature?.max, "°C")}</p>
          <p className="mt-1 text-sm text-[#89a5d8]">Ngưỡng nhiệt độ</p>
        </div>

        <div className="rounded-2xl border border-cyan-400/20 bg-[#071a3f]/70 p-4 text-center">
          <Power className="mx-auto mb-2 text-cyan-300" size={22} />
          <p className="text-3xl font-bold text-cyan-300">{activeCount}/{totalCount}</p>
          <p className="mt-1 text-sm text-[#89a5d8]">Thiết bị đang bật</p>
        </div>
      </div>

      <div className="mt-5 space-y-4 rounded-2xl border border-[#16335f] bg-[#061534]/60 p-4">
        <div className="grid grid-cols-1 gap-4">
          <div className="space-y-3 rounded-xl bg-[#f7f5fc] p-4 xl:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-[#5a4aa2]">Trend Graph</h3>
              <div className="flex items-center gap-2">
                <select
                  className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700"
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
                  className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700"
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

            {timeseriesError ? <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{timeseriesError}</p> : null}
            {timeseriesLoading ? <p className="text-xs text-gray-500">Loading graph...</p> : <TimeseriesChart points={timeseries} metric={metric} />}
          </div>
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-[#16335f] bg-[#061534]/60 p-4">
        <h2 className="mb-3 text-lg font-semibold text-white">Thiết bị trong phòng</h2>

        <div className="mb-5">
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="text-xs uppercase tracking-wider text-[#7f96c0]">Thông tin cảm biến</p>
            <span className="text-xs text-[#8aa3ce]">{sensorReadings.length} cảm biến</span>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {sensorReadings.map((sensor) => {
              const hasValue = sensor.value !== null;
              const thresholdText =
                sensor.thresholdMin !== undefined || sensor.thresholdMax !== undefined
                  ? `${formatValue(sensor.thresholdMin, sensor.unit)} ~ ${formatValue(sensor.thresholdMax, sensor.unit)}`
                  : "--";

              return (
                <div key={sensor.key} className="rounded-xl border border-[#17355e] bg-[#0a1a3f] px-3 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-white">{sensor.label}</p>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${hasValue ? "bg-cyan-500/20 text-cyan-200" : "bg-white/10 text-white/60"}`}>
                      {hasValue ? "Dang cap nhat" : "Khong co du lieu"}
                    </span>
                  </div>
                  <p className="mt-2 text-3xl font-bold text-white">{formatValue(sensor.value, sensor.unit)}</p>
                  <p className="mt-1 text-xs text-[#8ea9d8]">Ngưỡng: {thresholdText}</p>
                  <p className="mt-1 text-xs text-[#8ea9d8]">Cập nhật: {formatDateTime(sensor.updatedAt)}</p>
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-xs uppercase tracking-wider text-[#7f96c0]">Thiet bi dieu khien ({controlDevices.length})</p>
            <button
              type="button"
              onClick={handleAddDevice}
              className="rounded-lg bg-emerald-500/20 px-2.5 py-1 text-xs font-semibold text-emerald-200 transition hover:bg-emerald-500/30"
            >
              + Add Device
            </button>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {controlDevices.length === 0 && <p className="text-sm text-[#8aa3ce]">Chua co thiet bi dieu khien.</p>}
            {controlDevices.map((device) => (
              <div key={device.id} className="flex items-center justify-between rounded-xl border border-[#17355e] bg-[#0a1a3f] px-3 py-2.5">
                <div className="min-w-0 pr-2">
                  <p className="truncate text-sm font-medium text-white">{device.deviceName || device.name + device.deviceId}</p>
                  <p className="text-xs text-[#90a8d4]">{getStatusText(device.status)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleDeleteDevice(device.id)}
                    className="inline-flex items-center gap-1 rounded bg-rose-500/20 px-2 py-1 text-xs font-semibold text-rose-200 transition hover:bg-rose-500/30"
                  >
                    <Trash2 size={12} /> Delete
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleDevice(device.id)}
                    disabled={pendingControlIds.includes(device.id)}
                    className={`h-6 w-10 rounded-full p-1 transition ${device.status === "on" ? "bg-cyan-400" : "bg-white/20"} ${pendingControlIds.includes(device.id) ? "cursor-not-allowed opacity-60" : ""}`}
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
        <div className="rounded-2xl border border-[#16335f] bg-[#061534]/60 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Bot size={18} className="text-cyan-300" />
              <h3 className="text-lg font-semibold text-white">Automation</h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={reloadRoomMeta}
                disabled={metaLoading}
                className="rounded-lg bg-white/10 p-1.5 text-cyan-200 transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60"
                title="Lam moi"
              >
                <RefreshCw size={14} />
              </button>
              <button
                onClick={openAutomationModal}
                className="rounded-lg bg-emerald-500/20 px-3 py-1.5 text-xs font-semibold text-emerald-200 transition hover:bg-emerald-500/30"
              >
                + Create
              </button>
            </div>
          </div>

          {metaLoading ? <p className="text-sm text-[#8aa3ce]">Dang tai...</p> : null}

          <div className="space-y-2">
            {roomAwareAutomation.slice(0, 8).map((rule) => (
              <div key={rule.rule_id} className="rounded-xl border border-[#17355e] bg-[#0a1a3f] px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-white">{rule.name || `Rule ${rule.rule_id}`}</p>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${rule.is_active ? "bg-emerald-500/20 text-emerald-300" : "bg-white/10 text-white/70"}`}>
                    {rule.is_active ? "Active" : "Off"}
                  </span>
                </div>
                <p className="mt-1 text-xs text-[#8ea9d8]">{rule.displayCondition || "No condition"}</p>
                <p className="mt-1 text-xs text-[#8ea9d8]">Ap dung: {rule.apply_to || "--"} • Alert: {rule.alert_level || "--"}</p>
                <p className="mt-1 text-xs text-[#8ea9d8]">Action: {rule.action_name || "--"}</p>
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => handleToggleAutomation(rule.rule_id)}
                    disabled={busyKey === `automation-toggle-${rule.rule_id}`}
                    className="rounded bg-cyan-500/20 px-2 py-1 text-xs font-semibold text-cyan-200 hover:bg-cyan-500/30 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {busyKey === `automation-toggle-${rule.rule_id}` ? "..." : "Toggle"}
                  </button>
                  <button
                    onClick={() => handleDeleteAutomation(rule.rule_id)}
                    disabled={busyKey === `automation-delete-${rule.rule_id}`}
                    className="rounded bg-rose-500/20 px-2 py-1 text-xs font-semibold text-rose-200 hover:bg-rose-500/30 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <span className="inline-flex items-center gap-1"><Trash2 size={12} /> Delete</span>
                  </button>
                </div>
              </div>
            ))}
            {!metaLoading && roomAwareAutomation.length === 0 ? <p className="text-sm text-[#8aa3ce]">Chua co quy tac automation.</p> : null}
          </div>
        </div>

        <div className="rounded-2xl border border-[#16335f] bg-[#061534]/60 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <CalendarClock size={18} className="text-cyan-300" />
              <h3 className="text-lg font-semibold text-white">Schedules</h3>
            </div>
            <button
              onClick={openCreateScheduleForm}
              className="rounded-lg bg-emerald-500/20 px-3 py-1.5 text-xs font-semibold text-emerald-200 transition hover:bg-emerald-500/30"
            >
              + Create
            </button>
          </div>

          <div className="mb-3 inline-flex overflow-hidden rounded-lg border border-[#17355e] text-xs">
            {[
              { key: "all", label: "All" },
              { key: "active", label: "Active" },
              { key: "inactive", label: "Inactive" },
            ].map((item) => (
              <button
                key={item.key}
                onClick={() => setScheduleFilter(item.key)}
                className={`px-2 py-1.5 transition ${scheduleFilter === item.key ? "bg-cyan-500/30 text-cyan-200" : "bg-[#0a1a3f] text-[#8ea9d8]"}`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            {filteredSchedules.slice(0, 8).map((item) => (
              <div key={item.id} className="rounded-xl border border-[#17355e] bg-[#0a1a3f] px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-white">{item.name || `Schedule ${item.id}`}</p>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${item.is_active ? "bg-emerald-500/20 text-emerald-300" : "bg-white/10 text-white/70"}`}>
                    {item.is_active ? "Active" : "Off"}
                  </span>
                </div>
                <p className="mt-1 text-xs text-[#8ea9d8]">{item.start_time?.slice(0, 5) || "--:--"} - {item.end_time?.slice(0, 5) || "--:--"} | {item.days_of_week || "No days"}</p>
                <p className="mt-1 text-xs text-[#8ea9d8]">Action: {item.action || "--"}</p>
                <p className="mt-1 text-xs text-[#8ea9d8]">Devices: {item.device_names || "--"}</p>
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => openEditScheduleForm(item)}
                    className="rounded bg-white/10 px-2 py-1 text-xs font-semibold text-[#c5d6f2] hover:bg-white/20"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleToggleSchedule(item.id)}
                    disabled={busyKey === `schedule-toggle-${item.id}`}
                    className="rounded bg-cyan-500/20 px-2 py-1 text-xs font-semibold text-cyan-200 hover:bg-cyan-500/30 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {busyKey === `schedule-toggle-${item.id}` ? "..." : "Toggle"}
                  </button>
                  <button
                    onClick={() => handleDeleteSchedule(item.id)}
                    disabled={busyKey === `schedule-delete-${item.id}`}
                    className="rounded bg-rose-500/20 px-2 py-1 text-xs font-semibold text-rose-200 hover:bg-rose-500/30 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <span className="inline-flex items-center gap-1"><Trash2 size={12} /> Delete</span>
                  </button>
                </div>
              </div>
            ))}
            {!metaLoading && filteredSchedules.length === 0 ? <p className="text-sm text-[#8aa3ce]">Chua co lich tu dong cho phong nay.</p> : null}
          </div>
        </div>

        <div className="rounded-2xl border border-[#16335f] bg-[#061534]/60 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <ClipboardList size={18} className="text-cyan-300" />
              <h3 className="text-lg font-semibold text-white">Device logs</h3>
            </div>
            <button
              onClick={handleExportAudit}
              disabled={busyKey === "audit-export"}
              className="rounded-lg bg-cyan-500/20 px-3 py-1.5 text-xs font-semibold text-cyan-200 transition hover:bg-cyan-500/30 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busyKey === "audit-export" ? "Dang export..." : "Export CSV"}
            </button>
          </div>

          <div className="mb-2 rounded-lg border border-[#17355e] bg-[#0a1a3f] px-3 py-2 text-xs text-[#8ea9d8]">
            Area {selectedAreaId || "--"} | Floor {selectedFloorId || "--"} | Room {selectedRoomId || "--"}
          </div>

          {metaLoading ? <p className="text-sm text-[#8aa3ce]">Dang tai...</p> : null}

          <input
            value={auditActionFilter}
            onChange={(event) => setAuditActionFilter(event.target.value)}
            placeholder="Loc theo type, id, status"
            className="mb-2 w-full rounded-lg border border-[#17355e] bg-[#0a1a3f] px-2 py-1.5 text-xs text-white outline-none"
          />

          <div className="space-y-2">
            {groupedAuditItems.slice(0, 12).map((group) => {
              const latest = group.logs[0];
              return (
                <div key={group.key} className="rounded-xl border border-[#17355e] bg-[#0a1a3f]">
                  <button
                    onClick={() => handleExpandAudit(group.key)}
                    className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">{group.type} #{group.deviceId}</p>
                      <p className="truncate text-[11px] text-[#8ea9d8]">{group.roomName} • {group.logs.length} logs</p>
                    </div>
                    <div className="text-right text-[11px] text-[#8ea9d8]">
                      <p className="font-semibold text-cyan-200">{latest?.status || "--"}</p>
                      <p>{formatDateTime(latest?.timestamp)}</p>
                    </div>
                  </button>

                  {expandedAuditId === group.key ? (
                    <div className="border-t border-[#1d3d69] bg-[#081731] px-3 py-2">
                      <div className="space-y-1 text-xs text-[#9eb6df]">
                        {group.logs.slice(0, 10).map((log) => (
                          <div key={log.id} className="flex items-center justify-between gap-2 rounded-md bg-[#0a1d3d] px-2 py-1">
                            <span className="font-medium text-cyan-200">{log.status || "--"}</span>
                            <span className="text-[#8ea9d8]">{formatDateTime(log.timestamp)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
            {!metaLoading && groupedAuditItems.length === 0 ? <p className="text-sm text-[#8aa3ce]">Chua co device log cho phong nay.</p> : null}
          </div>
        </div>
      </div>

      <Modal isOpen={isAutomationModalOpen} onClose={() => setIsAutomationModalOpen(false)}>
        <div className="space-y-4">
          <div>
            <h3 className="text-xl font-bold text-[#24124d]">Create automation rule</h3>
            <p className="text-sm text-gray-500">Create the rule without leaving this room page.</p>
          </div>

          {automationFormError ? <div className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{automationFormError}</div> : null}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="text-sm font-medium text-gray-700">
              Rule name
              <input
                value={automationForm.name}
                onChange={(event) => setAutomationForm((prev) => ({ ...prev, name: event.target.value }))}
                className="mt-2 w-full rounded-xl border border-purple-200 bg-white px-3 py-2 text-sm outline-none focus:border-purple-400"
                placeholder="Temperature high alert"
              />
            </label>

            <label className="text-sm font-medium text-gray-700">
              Apply to
              <input
                value={roomTitle}
                disabled
                className="mt-2 w-full rounded-xl border border-purple-200 bg-gray-100 px-3 py-2 text-sm text-gray-500 outline-none"
              />
            </label>

            <label className="text-sm font-medium text-gray-700">
              Metric
              <select
                value={automationForm.metric}
                onChange={(event) => setAutomationForm((prev) => ({ ...prev, metric: event.target.value }))}
                className="mt-2 w-full rounded-xl border border-purple-200 bg-white px-3 py-2 text-sm outline-none focus:border-purple-400"
              >
                <option value="Temperature">Temperature</option>
                <option value="Humidity">Humidity</option>
              </select>
            </label>

            <label className="text-sm font-medium text-gray-700">
              Compare
              <select
                value={automationForm.compare_op}
                onChange={(event) => setAutomationForm((prev) => ({ ...prev, compare_op: event.target.value }))}
                className="mt-2 w-full rounded-xl border border-purple-200 bg-white px-3 py-2 text-sm outline-none focus:border-purple-400"
              >
                {COMPARE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm font-medium text-gray-700">
              Threshold
              <input
                value={automationForm.threshold_value}
                onChange={(event) => setAutomationForm((prev) => ({ ...prev, threshold_value: event.target.value }))}
                className="mt-2 w-full rounded-xl border border-purple-200 bg-white px-3 py-2 text-sm outline-none focus:border-purple-400"
                placeholder="30"
              />
            </label>

            <label className="text-sm font-medium text-gray-700">
              Alert level
              <select
                value={automationForm.alert_level}
                onChange={(event) => setAutomationForm((prev) => ({ ...prev, alert_level: event.target.value }))}
                className="mt-2 w-full rounded-xl border border-purple-200 bg-white px-3 py-2 text-sm outline-none focus:border-purple-400"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </label>

            <label className="text-sm font-medium text-gray-700 md:col-span-2">
              Action name
              <input
                value={automationForm.action_name}
                onChange={(event) => setAutomationForm((prev) => ({ ...prev, action_name: event.target.value }))}
                className="mt-2 w-full rounded-xl border border-purple-200 bg-white px-3 py-2 text-sm outline-none focus:border-purple-400"
                placeholder="Bật máy lạnh"
              />
            </label>
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsAutomationModalOpen(false)}
              className="rounded-xl bg-gray-100 px-5 py-2 font-semibold text-gray-700 hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => handleSubmitAutomation(roomTitle)}
              disabled={busyKey === "automation-create"}
              className="rounded-xl bg-green-500 px-5 py-2 font-semibold text-white hover:bg-green-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busyKey === "automation-create" ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={isScheduleModalOpen} onClose={() => setIsScheduleModalOpen(false)}>
        <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); handleSubmitSchedule(); }}>
          <div>
            <h3 className="text-xl font-bold text-[#24124d]">{scheduleEditingId ? "Edit schedule" : "Create schedule"}</h3>
            <p className="text-sm text-gray-500">Manage recurring actions directly from this room.</p>
          </div>

          {scheduleFormError ? <div className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{scheduleFormError}</div> : null}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="text-sm font-medium text-gray-700 md:col-span-2">
              Schedule name
              <input
                value={scheduleForm.name}
                onChange={(event) => setScheduleForm((prev) => ({ ...prev, name: event.target.value }))}
                className="mt-2 w-full rounded-xl border border-purple-200 bg-white px-3 py-2 text-sm outline-none focus:border-purple-400"
                placeholder="Night cooling"
              />
            </label>

            <label className="text-sm font-medium text-gray-700">
              Start time
              <input
                type="time"
                value={scheduleForm.start_time}
                onChange={(event) => setScheduleForm((prev) => ({ ...prev, start_time: event.target.value }))}
                className="mt-2 w-full rounded-xl border border-purple-200 bg-white px-3 py-2 text-sm outline-none focus:border-purple-400"
              />
            </label>

            <label className="text-sm font-medium text-gray-700">
              End time
              <input
                type="time"
                value={scheduleForm.end_time}
                onChange={(event) => setScheduleForm((prev) => ({ ...prev, end_time: event.target.value }))}
                className="mt-2 w-full rounded-xl border border-purple-200 bg-white px-3 py-2 text-sm outline-none focus:border-purple-400"
              />
            </label>

            <label className="text-sm font-medium text-gray-700 md:col-span-2">
              Action
              <select
                value={scheduleForm.action}
                onChange={(event) => setScheduleForm((prev) => ({ ...prev, action: event.target.value }))}
                className="mt-2 w-full rounded-xl border border-purple-200 bg-white px-3 py-2 text-sm outline-none focus:border-purple-400"
              >
                {ACTION_OPTIONS.map((action) => (
                  <option key={action} value={action}>
                    {action}
                  </option>
                ))}
              </select>
            </label>

            <div className="md:col-span-2">
              <p className="text-sm font-medium text-gray-700">Days of week</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {DAY_OPTIONS.map((day) => {
                  const selected = scheduleForm.days.includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleScheduleDay(day)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${selected ? "bg-[#6c4fd3] text-white" : "bg-[#ece6f8] text-[#1d1645] hover:bg-[#ddd0f4]"}`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="md:col-span-2">
              <p className="text-sm font-medium text-gray-700">Devices</p>
              <div className="mt-2 grid max-h-52 grid-cols-1 gap-2 overflow-auto sm:grid-cols-2">
                {scheduleDeviceOptions.length === 0 ? (
                  <p className="text-sm text-gray-500">No devices found for this room.</p>
                ) : (
                  scheduleDeviceOptions.map((device) => {
                    const id = Number(device.id);
                    const selected = scheduleForm.device_ids.includes(id);
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => toggleScheduleDevice(id)}
                        className={`rounded-lg border px-3 py-2 text-left text-xs ${selected ? "border-cyan-400 bg-cyan-50 text-cyan-900" : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"}`}
                      >
                        {device.name}
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
              className="rounded-xl bg-gray-100 px-5 py-2 font-semibold text-gray-700 hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busyKey === "schedule-submit"}
              className="rounded-xl bg-green-500 px-5 py-2 font-semibold text-white hover:bg-green-600 disabled:cursor-not-allowed disabled:opacity-60"
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
