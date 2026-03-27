const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5001/api";

async function request(url, options = {}) {
  const response = await fetch(`${API_BASE_URL}${url}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || "Request failed");
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
};

