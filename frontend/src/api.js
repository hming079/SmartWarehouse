const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5001/api";

async function request(url, options = {}) {
  const token = localStorage.getItem("auth_token");
  let response;
  try {
    response = await fetch(`${API_BASE_URL}${url}`, {
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
      ...options,
    });
  } catch (networkError) {
    throw new Error(networkError?.message || "Cannot connect to API server");
  }

  if (!response.ok) {
    const errorPayload = await response.json().catch(() => ({}));
    const requestError = new Error(
      errorPayload.message || errorPayload.error || "Request failed",
    );
    requestError.status = response.status;
    requestError.payload = errorPayload;
    throw requestError;
  }

  return response.json();
}

export const api = {
  login: (payload) => request("/auth/login", { method: "POST", body: JSON.stringify(payload) }),
  logout: () => request("/auth/logout", { method: "POST" }),
  getMe: () => request("/auth/me"),

  getUsers: () => request("/users"),
  createUser: (payload) => request("/users", { method: "POST", body: JSON.stringify(payload) }),

  getZones: (locationId) => request(`/zones?locationId=${locationId}`),
  createZone: (payload) => request("/zones", { method: "POST", body: JSON.stringify(payload) }),
  deleteZone: (id) => request(`/zones/${id}`, { method: "DELETE" }),
  getFloors: (zoneId) => request(`/floors?zoneId=${zoneId}`),
  createFloor: (payload) => request("/floors", { method: "POST", body: JSON.stringify(payload) }),
  deleteFloor: (id) => request(`/floors/${id}`, { method: "DELETE" }),
  getRooms: (floorId) => request(`/rooms?floorId=${floorId}`),
  getFoodTypes: () => request("/food-types"),
  createRoom: (payload) => request("/rooms", { method: "POST", body: JSON.stringify(payload) }),
  deleteRoom: (id) => request(`/rooms/${id}`, { method: "DELETE" }),

  getAutomationRules: () => request("/automation"),
  createAutomationRule: (payload) => request("/automation", { method: "POST", body: JSON.stringify(payload) }),
  toggleAutomationRule: (id) => request(`/automation/${id}/toggle`, { method: "PATCH" }),
  deleteAutomationRule: (id) => request(`/automation/${id}`, { method: "DELETE" }),
  updateAutomationRule: (id, payload) => request(`/automation/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),

  getAuditLogs: ({ page, pageSize, from, to, actor, action, roomId } = {}) => {
    const params = new URLSearchParams();
    if (page) params.set("page", String(page));
    if (pageSize) params.set("pageSize", String(pageSize));
    if (from) params.set("from", String(from));
    if (to) params.set("to", String(to));
    if (actor) params.set("actor", String(actor));
    if (action) params.set("action", String(action));
    if (roomId) params.set("roomId", String(roomId));
    const query = params.toString();
    return request(`/audit-logs${query ? `?${query}` : ""}`);
  },
  getAuditLogById: (id) => request(`/audit-logs/${id}`),
  exportAuditLogs: (payload) => request("/audit-logs/export", { method: "POST", body: JSON.stringify(payload) }),

  getSchedules: ({ roomId, deviceId, active } = {}) => {
    const params = new URLSearchParams();
    if (roomId) params.set("roomId", String(roomId));
    if (deviceId) params.set("deviceId", String(deviceId));
    if (active !== undefined && active !== null) {
      params.set("active", String(Boolean(active)));
    }
    const query = params.toString();
    return request(`/schedules${query ? `?${query}` : ""}`);
  },
  createSchedule: (payload) => request("/schedules", { method: "POST", body: JSON.stringify(payload) }),
  updateSchedule: (id, payload) => request(`/schedules/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
  toggleSchedule: (id) => request(`/schedules/${id}/toggle`, { method: "PATCH" }),
  deleteSchedule: (id) => request(`/schedules/${id}`, { method: "DELETE" }),
  getScheduleDevices: ({ roomId } = {}) => {
    const params = new URLSearchParams();
    if (roomId) params.set("roomId", String(roomId));
    const query = params.toString();
    return request(`/schedules/devices${query ? `?${query}` : ""}`);
  },

  getDevices: (roomId) => request(`/devices${roomId ? `?roomId=${roomId}` : ""}`),
  createDevice: (payload) => request("/devices", { method: "POST", body: JSON.stringify(payload) }),
  updateDevice: (id, payload) => request(`/devices/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
  deleteDevice: (id) => request(`/devices/${id}`, { method: "DELETE" }),
  toggleDevice: (id) => request(`/devices/${id}/toggle`, { method: "PATCH" }),
  getDeviceLogs: ({ roomId, page, pageSize } = {}) => {
    const params = new URLSearchParams();
    if (roomId) params.set("roomId", String(roomId));
    if (page) params.set("page", String(page));
    if (pageSize) params.set("pageSize", String(pageSize));
    const query = params.toString();
    return request(`/devices/logs/history${query ? `?${query}` : ""}`);
  },

  getDashboardOverview: () => request("/dashboard/overview"),
  getDashboardTimeseries: ({ roomId, metric, range } = {}) => {
    const params = new URLSearchParams();
    if (roomId) params.set("roomId", String(roomId));
    if (metric) params.set("metric", metric);
    if (range) params.set("range", range);
    const query = params.toString();
    return request(`/dashboard/timeseries${query ? `?${query}` : ""}`);
  },
  getDashboardDeviceStatus: ({ roomId } = {}) => {
    const params = new URLSearchParams();
    if (roomId) params.set("roomId", String(roomId));
    const query = params.toString();
    return request(`/dashboard/device-status${query ? `?${query}` : ""}`);
  },
  getDashboardAlertsSummary: ({ range } = {}) => {
    const params = new URLSearchParams();
    if (range) params.set("range", range);
    const query = params.toString();
    return request(`/dashboard/alerts-summary${query ? `?${query}` : ""}`);
  },

  getIotData: ({ roomId } = {}) => {
    const params = new URLSearchParams();
    if (roomId) params.set("roomId", String(roomId));
    const query = params.toString();
    return request(`/iot/data${query ? `?${query}` : ""}`);
  },
  controlIotDevice: (payload) =>
    request("/iot/control", { method: "POST", body: JSON.stringify(payload) }),
  registerIotSwitch: (roomId, payload) =>
    request(`/iot/rooms/${roomId}/switches`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  getAlerts: ({ roomId, status, severity, page, pageSize } = {}) => {
    const params = new URLSearchParams();
    if (roomId) params.set("roomId", String(roomId));
    if (status) params.set("status", status);
    if (severity) params.set("severity", severity);
    if (page) params.set("page", String(page));
    if (pageSize) params.set("pageSize", String(pageSize));
    const query = params.toString();
    return request(`/alerts${query ? `?${query}` : ""}`);
  },
  getAlertById: (id) => request(`/alerts/${id}`),
  acknowledgeAlert: (id) => request(`/alerts/${id}/ack`, { method: "PATCH" }),
  resolveAlert: (id) => request(`/alerts/${id}/resolve`, { method: "PATCH" }),
  toggleResolveAlert: (id) => request(`/alerts/${id}/toggle-resolve`, { method: "PATCH" }),
  assignAlert: (id, payload) => request(`/alerts/${id}/assign`, { method: "POST", body: JSON.stringify(payload) }),

  getActions: () => request("/actions"),
};
