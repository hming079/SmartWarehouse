import { useEffect, useMemo, useState } from "react";
import { api } from "../../api";

// Constants
export const DAY_OPTIONS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
export const ACTION_OPTIONS = ["POWER_ON", "POWER_OFF", "LOW_POWER"];
export const COMPARE_OPTIONS = [
  { value: ">", label: "Lớn hơn" },
  { value: "<", label: "Nhỏ hơn" },
  { value: "=", label: "Bằng" },
];

// Factory functions
export const createInitialScheduleForm = () => ({
  name: "",
  start_time: "08:00",
  end_time: "18:00",
  days: ["MON", "TUE", "WED", "THU", "FRI"],
  device_ids: [],
  action: "POWER_ON",
});

export const createInitialAutomationForm = () => ({
  name: "",
  metric: "Temperature",
  compare_op: ">",
  threshold_value: "",
  action_name: "Bật máy lạnh",
  alert_level: "Medium",
  food_type: "General",
  actionDeviceIds: [],
  actionDeviceType: "fan",
});

// Utility functions
export const toNumberOrNull = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

export const formatValue = (value, suffix) => {
  if (value === null || value === undefined) return "--";
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "--";
  return `${numeric.toFixed(1)}${suffix}`;
};

export const getStatusText = (status) =>
  String(status || "").toLowerCase() === "on" ? "Dang bat" : "Dang tat";

export const formatDateTime = (value) => {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleString("vi-VN");
};

export const normalizeBoolean = (value) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  return String(value || "").toLowerCase() === "true";
};

export const parseDays = (value) =>
  String(value || "")
    .split(",")
    .map((item) => item.trim().toUpperCase())
    .filter(Boolean);

export const parseDeviceIds = (value) =>
  String(value || "")
    .split(",")
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isInteger(item) && item > 0);

export const toTimeInput = (value) => {
  const raw = String(value || "");
  return raw.length >= 5 ? raw.slice(0, 5) : raw;
};

export const isTelemetryDevice = (device) => {
  const type = String(device?.type || "").toLowerCase();
  return type === "temperature" || type === "humidity";
};

// Main hook
export const useRoomDetail = (selectedRoomId, payload) => {
  // Automation state
  const [automationItems, setAutomationItems] = useState([]);
  const [automationForm, setAutomationForm] = useState(createInitialAutomationForm());
  const [automationFormError, setAutomationFormError] = useState("");
  const [isAutomationModalOpen, setIsAutomationModalOpen] = useState(false);
  const [quickRuleName, setQuickRuleName] = useState("");
  const [quickRuleThreshold, setQuickRuleThreshold] = useState("");

  // Schedule state
  const [schedulesItems, setSchedulesItems] = useState([]);
  const [scheduleForm, setScheduleForm] = useState(createInitialScheduleForm());
  const [scheduleFormError, setScheduleFormError] = useState("");
  const [scheduleEditingId, setScheduleEditingId] = useState(null);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [scheduleFilter, setScheduleFilter] = useState("all");
  const [scheduleDeviceOptions, setScheduleDeviceOptions] = useState([]);

  // Audit state
  const [auditItems, setAuditItems] = useState([]);
  const [auditActionFilter, setAuditActionFilter] = useState("");
  const [expandedAuditId, setExpandedAuditId] = useState(null);

  // Loading/Error state
  const [metaLoading, setMetaLoading] = useState(false);
  const [metaError, setMetaError] = useState("");
  const [metaInfo, setMetaInfo] = useState("");
  const [busyKey, setBusyKey] = useState("");

  // Fetch room metadata
  const fetchRoomMeta = async () => {
    if (!selectedRoomId) {
      return {
        automationData: [],
        schedulesData: [],
        scheduleDeviceData: [],
        auditData: [],
      };
    }

    const [automationRes, schedulesRes, scheduleDevicesRes, auditRes] = await Promise.all([
      api.getAutomationRules(),
      api.getSchedules({ roomId: selectedRoomId }),
      api.getScheduleDevices({ roomId: selectedRoomId }),
      api.getDeviceLogs({ roomId: selectedRoomId, page: 1, pageSize: 20 }),
    ]);

    return {
      automationData: automationRes?.data || [],
      schedulesData: schedulesRes?.data || [],
      scheduleDeviceData: scheduleDevicesRes?.data || [],
      auditData: auditRes?.data || [],
    };
  };

  const reloadRoomMeta = async () => {
    try {
      setMetaLoading(true);
      setMetaError("");
      setMetaInfo("");
      const { automationData, schedulesData, scheduleDeviceData, auditData } = await fetchRoomMeta();
      setAutomationItems(automationData);
      setSchedulesItems(schedulesData);
      setScheduleDeviceOptions(scheduleDeviceData);
      setAuditItems(auditData);
    } catch (err) {
      setMetaError(err.message || "Khong the tai du lieu automation/schedule/device logs");
    } finally {
      setMetaLoading(false);
    }
  };
  // Add automationEditingId state
  const [automationEditingId, setAutomationEditingId] = useState(null);
  // Open edit automation modal
  const openEditAutomationModal = (rule) => {
    setAutomationEditingId(rule.rule_id);
    setAutomationForm({
      ...rule,
      actionDeviceIds: rule.action_device_ids ? String(rule.action_device_ids).split(",") : [],
      actionDeviceType: rule.action_device_types || "fan",
      actionType: rule.action_name ? "action" : "alert",
      actionOnOff: rule.action_name && rule.action_name.toLowerCase().includes("tắt") ? "off" : "on",
    });
    setAutomationFormError("");
    setIsAutomationModalOpen(true);
  };
  // Load metadata on mount/selectedRoomId change
  useEffect(() => {
    let cancelled = false;

    const loadRoomMeta = async () => {
      if (!selectedRoomId) return;
      try {
        setMetaLoading(true);
        setMetaError("");

        const { automationData, schedulesData, scheduleDeviceData, auditData } = await fetchRoomMeta();
        if (cancelled) return;

        setAutomationItems(automationData);
        setSchedulesItems(schedulesData);
        setScheduleDeviceOptions(scheduleDeviceData);
        setAuditItems(auditData);
      } catch (err) {
        if (!cancelled) {
          setMetaError(err.message || "Khong the tai du lieu automation/schedule/device logs");
        }
      } finally {
        if (!cancelled) {
          setMetaLoading(false);
        }
      }
    };

    loadRoomMeta();
    return () => {
      cancelled = true;
    };
  }, [selectedRoomId]);

  // Automation handlers
  const handleToggleAutomation = async (ruleId) => {
    try {
      setBusyKey(`automation-toggle-${ruleId}`);
      const result = await api.toggleAutomationRule(ruleId);
      setAutomationItems((prev) =>
        prev.map((item) =>
          item.rule_id === ruleId
            ? {
                ...item,
                is_active: result?.is_active ?? !normalizeBoolean(item.is_active),
              }
            : item,
        ),
      );
    } catch (err) {
      setMetaError(err.message || "Khong the doi trang thai automation");
    } finally {
      setBusyKey("");
    }
  };

  const handleDeleteAutomation = async (ruleId) => {
    const confirmed = window.confirm("Xoa quy tac automation nay?");
    if (!confirmed) return;
    try {
      setBusyKey(`automation-delete-${ruleId}`);
      await api.deleteAutomationRule(ruleId);
      setAutomationItems((prev) => prev.filter((item) => item.rule_id !== ruleId));
    } catch (err) {
      setMetaError(err.message || "Khong the xoa automation");
    } finally {
      setBusyKey("");
    }
  };

  const handleCreateQuickAutomation = async () => {
    setAutomationForm({
      ...createInitialAutomationForm(),
      name: quickRuleName.trim(),
      threshold_value: quickRuleThreshold,
    });
    setAutomationFormError("");
    setIsAutomationModalOpen(true);
  };

  const openAutomationModal = () => {
    setAutomationForm(createInitialAutomationForm());
    setAutomationFormError("");
    setIsAutomationModalOpen(true);
  };

  // Add editMode param
  const handleSubmitAutomation = async (roomTitle, payloadOverride, editMode = false) => {
    const form = payloadOverride || automationForm;
    const name = String(form.name || "").trim();
    const thresholdValue = Number(form.threshold_value);
    if (!name || !Number.isFinite(thresholdValue)) {
      setAutomationFormError("Nhap ten rule va nguong hop le");
      return;
    }

    try {
      setBusyKey("automation-create");
      setAutomationFormError("");
      setMetaError("");
      if (editMode && form.rule_id) {
        // Update existing rule
        await api.updateAutomationRule(form.rule_id, {
          name,
          apply_to: roomTitle,
          food_type: form.food_type,
          metric: form.metric,
          compare_op: form.compare_op,
          threshold_value: thresholdValue,
          action_name: form.action_name,
          action_device_ids: (form.actionDeviceIds || []).join(","),
          action_device_types: form.actionDeviceType ? form.actionDeviceType : "",
          alert_level: form.alert_level,
          is_active: true,
        });
      } else {
        // Create new rule
        await api.createAutomationRule({
          name,
          apply_to: roomTitle,
          food_type: form.food_type,
          metric: form.metric,
          compare_op: form.compare_op,
          threshold_value: thresholdValue,
          action_name: form.action_name,
          action_device_ids: (form.actionDeviceIds || []).join(","),
          action_device_types: form.actionDeviceType ? form.actionDeviceType : "",
          alert_level: form.alert_level,
          is_active: true,
        });
      }

      setQuickRuleName("");
      setQuickRuleThreshold("");
      setIsAutomationModalOpen(false);
      setAutomationEditingId(null);
      setAutomationForm(createInitialAutomationForm());
      await reloadRoomMeta();
    } catch (err) {
      setAutomationFormError(err.message || (editMode ? "Khong the sua automation" : "Khong the tao automation"));
    } finally {
      setBusyKey("");
    }
    // Export edit helpers
    return {
      ... // existing exports ...
      openEditAutomationModal,
      automationEditingId,
      setAutomationEditingId,
      handleSubmitAutomation,
    };
  };

  // Schedule handlers
  const handleToggleSchedule = async (scheduleId) => {
    try {
      setBusyKey(`schedule-toggle-${scheduleId}`);
      const result = await api.toggleSchedule(scheduleId);
      setSchedulesItems((prev) =>
        prev.map((item) =>
          item.id === scheduleId
            ? {
                ...item,
                is_active: result?.is_active ?? !normalizeBoolean(item.is_active),
              }
            : item,
        ),
      );
    } catch (err) {
      setMetaError(err.message || "Khong the doi trang thai schedule");
    } finally {
      setBusyKey("");
    }
  };

  const handleDeleteSchedule = async (scheduleId) => {
    const confirmed = window.confirm("Xoa schedule nay?");
    if (!confirmed) return;
    try {
      setBusyKey(`schedule-delete-${scheduleId}`);
      await api.deleteSchedule(scheduleId);
      setSchedulesItems((prev) => prev.filter((item) => item.id !== scheduleId));
    } catch (err) {
      setMetaError(err.message || "Khong the xoa schedule");
    } finally {
      setBusyKey("");
    }
  };

  const openCreateScheduleForm = () => {
    setScheduleEditingId(null);
    setScheduleForm(createInitialScheduleForm());
    setScheduleFormError("");
    setIsScheduleModalOpen(true);
  };

  const openEditScheduleForm = (item) => {
    setScheduleEditingId(item.id);
    setScheduleForm({
      name: item.name || "",
      start_time: toTimeInput(item.start_time) || "08:00",
      end_time: toTimeInput(item.end_time) || "18:00",
      days: parseDays(item.days_of_week),
      device_ids: parseDeviceIds(item.device_ids),
      action: item.action || "POWER_ON",
    });
    setScheduleFormError("");
    setIsScheduleModalOpen(true);
  };

  const toggleScheduleDay = (day) => {
    setScheduleForm((prev) => {
      const selected = prev.days.includes(day);
      return {
        ...prev,
        days: selected ? prev.days.filter((item) => item !== day) : [...prev.days, day],
      };
    });
  };

  const toggleScheduleDevice = (deviceId) => {
    setScheduleForm((prev) => {
      const selected = prev.device_ids.includes(deviceId);
      return {
        ...prev,
        device_ids: selected ? prev.device_ids.filter((id) => id !== deviceId) : [...prev.device_ids, deviceId],
      };
    });
  };

  const handleSubmitSchedule = async () => {
    const name = String(scheduleForm.name || "").trim();
    if (!name) {
      setScheduleFormError("Nhap ten lich");
      return;
    }
    if (!scheduleForm.start_time || !scheduleForm.end_time) {
      setScheduleFormError("Nhap gio bat dau va ket thuc");
      return;
    }
    if (!scheduleForm.days.length) {
      setScheduleFormError("Chon it nhat 1 ngay");
      return;
    }

    const payloadData = {
      name,
      start_time: scheduleForm.start_time,
      end_time: scheduleForm.end_time,
      days_of_week: scheduleForm.days.join(","),
      device_ids: scheduleForm.device_ids,
      action: scheduleForm.action,
    };

    try {
      setBusyKey("schedule-submit");
      setScheduleFormError("");
      if (scheduleEditingId) {
        await api.updateSchedule(scheduleEditingId, payloadData);
      } else {
        await api.createSchedule(payloadData);
      }
      setIsScheduleModalOpen(false);
      setScheduleEditingId(null);
      setScheduleForm(createInitialScheduleForm());
      await reloadRoomMeta();
    } catch (err) {
      setScheduleFormError(err.message || "Khong the luu schedule");
    } finally {
      setBusyKey("");
    }
  };

  // Audit handlers (Device Logs)
  const handleExpandAudit = async (auditId) => {
    // Device logs have all info already, just toggle expand
    setExpandedAuditId(expandedAuditId === auditId ? null : auditId);
  };

  const handleExportAudit = async () => {
    try {
      setBusyKey("audit-export");
      setMetaInfo("Export feature will be available soon for device logs");
    } catch (err) {
      setMetaError(err.message || "Khong the export device logs");
    } finally {
      setBusyKey("");
    }
  };

  // Computed values
  const filteredSchedules = useMemo(() => {
    if (scheduleFilter === "active") {
      return schedulesItems.filter((item) => normalizeBoolean(item.is_active));
    }
    if (scheduleFilter === "inactive") {
      return schedulesItems.filter((item) => !normalizeBoolean(item.is_active));
    }
    return schedulesItems;
  }, [schedulesItems, scheduleFilter]);

  const filteredAuditItems = useMemo(() => {
    const keyword = auditActionFilter.trim().toLowerCase();
    if (!keyword) return auditItems;
    return auditItems.filter((item) => {
      const searchable = [
        item.type,
        item.status,
        item.room_name,
        item.deviceId,
        item.device_id,
      ]
        .filter((value) => value !== undefined && value !== null)
        .join(" ")
        .toLowerCase();
      return searchable.includes(keyword);
    });
  }, [auditItems, auditActionFilter]);

  return {
    // Automation
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

    // Schedule
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

    // Audit
    auditItems,
    auditActionFilter,
    expandedAuditId,
    filteredAuditItems,
    setAuditActionFilter,
    handleExpandAudit,
    handleExportAudit,

    // Loading/Error
    metaLoading,
    metaError,
    metaInfo,
    busyKey,
    setMetaError,
    setMetaInfo,

    // Utilities
    reloadRoomMeta,
  };
};
