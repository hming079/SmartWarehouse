const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5001/api";

async function request(url, options = {}) {
  let response;
  try {
    response = await fetch(`${API_BASE_URL}${url}`, {
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
      ...options,
    });
  } catch (networkError) {
    throw new Error(networkError?.message || "Cannot connect to API server");
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || error.error || "Request failed");
  }

  return response.json();
}

export const api = {
  getZones: (locationId) => request(`/zones?locationId=${locationId}`),
  createZone: (payload) => request("/zones", { method: "POST", body: JSON.stringify(payload) }),
  deleteZone: (id) => request(`/zones/${id}`, { method: "DELETE" }),
  getFloors: (zoneId) => request(`/floors?zoneId=${zoneId}`),
  createFloor: (payload) => request("/floors", { method: "POST", body: JSON.stringify(payload) }),
  deleteFloor: (id) => request(`/floors/${id}`, { method: "DELETE" }),
  getRooms: (floorId) => request(`/rooms?floorId=${floorId}`),
  createRoom: (payload) => request("/rooms", { method: "POST", body: JSON.stringify(payload) }),
  deleteRoom: (id) => request(`/rooms/${id}`, { method: "DELETE" }),

  getAutomationRules: () => request("/automation"),
  createAutomationRule: (payload) => request("/automation", { method: "POST", body: JSON.stringify(payload) }),
  toggleAutomationRule: (id) => request(`/automation/${id}/toggle`, { method: "PATCH" }),
  deleteAutomationRule: (id) => request(`/automation/${id}`, { method: "DELETE" }),

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
};

