import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";

const IS_BROWSER = typeof window !== "undefined";

// Utility mappers
const toUiStatus = (status) =>
	String(status || "").toUpperCase() === "ON" ? "on" : "off";

const toUiType = (type, name) => {
	const normalized = `${type || ""} ${name || ""}`.toLowerCase();
	if (normalized.includes("temp")) return "temperature";
	if (normalized.includes("humid")) return "humidity";
	if (normalized.includes("fan") || normalized.includes("vent")) return "fan";
	if (normalized.includes("dryer") || normalized.includes("dry")) return "dryer";
	if (normalized.includes("light")) return "lights";
	if (normalized.includes("ac") || normalized.includes("air") || normalized.includes("cool")) return "ac";
	if (normalized.includes("fridge") || normalized.includes("cold")) return "fridge";
	return "lights";
};

const toSwitchDevice = (item) => {
	const fallbackName = item.name || item.key || "Switch";

	return {
		id: `switch-${item.key}`,
		name: fallbackName,
		deviceName: item.deviceName || fallbackName,
		deviceId: item.deviceId ?? null,
		deviceKey: item.key || null,
		status: toUiStatus(item.status),
		type: toUiType(item.type, item.name || item.key),
		isConnected: item.isConnected !== false,
	};
};

const createTelemetryDevice = ({ id, label, value, status, unit, type }) => ({
	id,
	name: Number.isNaN(value) ? label : `${label} (${value.toFixed(1)}${unit})`,
	deviceName: label,
	deviceId: null,
	deviceKey: type,
	status,
	type,
	isConnected: true,
});

// Telemetry transformation
const buildTelemetrySensors = (data, deviceStatus, switches = []) => {
	const tempValue = Number(data?.temperature?.[0]?.value ?? NaN);
	const humValue = Number(data?.humidity?.[0]?.value ?? NaN);
	const status = toUiStatus(deviceStatus);
	const switchDevices = Array.isArray(switches) ? switches.map(toSwitchDevice) : [];

	if (switchDevices.length > 0) {
		return switchDevices;
	}

	return [
		createTelemetryDevice({
			id: "telemetry-temperature",
			label: "Temperature",
			value: tempValue,
			status,
			unit: " C",
			type: "temperature",
		}),
		createTelemetryDevice({
			id: "telemetry-humidity",
			label: "Humidity",
			value: humValue,
			status,
			unit: "%",
			type: "humidity",
		}),
	];
};

const API_PORT = process.env.REACT_APP_API_PORT || "5001";
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || `http://localhost:${API_PORT}`;
const API_IOT_CONTROL_URL = `${API_BASE_URL}/api/iot/control`;
const API_IOT_WS_URL =
	process.env.REACT_APP_IOT_WS_URL ||
	`${API_BASE_URL.replace(/^http/i, "ws")}/ws/iot`;
const DEVICE_NAME_OVERRIDES_KEY = "smartwarehouse.device-name-overrides";
const DEVICE_HIDDEN_IDS_KEY = "smartwarehouse.device-hidden-ids";

const readStoredValue = (key, fallback) => {
	if (!IS_BROWSER) {
		return fallback;
	}

	try {
		const raw = window.localStorage.getItem(key);
		return raw ? JSON.parse(raw) : fallback;
	} catch (_) {
		return fallback;
	}
};

const writeStoredValue = (key, value) => {
	if (!IS_BROWSER) {
		return;
	}

	window.localStorage.setItem(key, JSON.stringify(value));
};

const applyLocalChanges = (devices, nameOverrides, hiddenDeviceIds) => {
	const hiddenSet = new Set(hiddenDeviceIds);

	return devices
		.map((device) => ({
			...device,
			name: nameOverrides[device.id] || device.name,
		}))
		.filter((device) => !hiddenSet.has(device.id));
};


const parseSocketMessage = (raw) => {
	try {
		return JSON.parse(raw);
	} catch (_) {
		return null;
	}
};

const mapPayloadToDevices = ({ payload, nameOverrides, hiddenDeviceIds }) =>
	applyLocalChanges(
		buildTelemetrySensors(payload?.data, payload?.deviceStatus, payload?.switches),
		nameOverrides,
		hiddenDeviceIds,
	);

export function useDeviceData() {
	const [searchParams] = useSearchParams();
	const roomIdParam = searchParams.get("roomId");
	const [deviceList, setDeviceList] = useState([]);
	const [devicesLoading, setDevicesLoading] = useState(true);
	const [devicesError, setDevicesError] = useState("");
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [payload, setPayload] = useState(null);
	const [nameOverrides, setNameOverrides] = useState(() =>
		readStoredValue(DEVICE_NAME_OVERRIDES_KEY, {}),
	);
	const [hiddenDeviceIds, setHiddenDeviceIds] = useState(() =>
		readStoredValue(DEVICE_HIDDEN_IDS_KEY, []),
	);
	const nameOverridesRef = useRef(nameOverrides);
	const hiddenDeviceIdsRef = useRef(hiddenDeviceIds);
	const toggleInProgressRef = useRef(new Set()); // Track devices currently being toggled

	useEffect(() => {
		nameOverridesRef.current = nameOverrides;
	}, [nameOverrides]);

	useEffect(() => {
		hiddenDeviceIdsRef.current = hiddenDeviceIds;
	}, [hiddenDeviceIds]);

	useEffect(() => {
		writeStoredValue(DEVICE_NAME_OVERRIDES_KEY, nameOverrides);
	}, [nameOverrides]);

	useEffect(() => {
		writeStoredValue(DEVICE_HIDDEN_IDS_KEY, hiddenDeviceIds);
	}, [hiddenDeviceIds]);

	useEffect(() => {
		if (!IS_BROWSER) {
			return undefined;
		}

		let closed = false;
		let socket = null;
		let reconnectTimer = null;

		const connect = () => {
			setLoading(true);
			setDevicesLoading(true);
			setError("");

			const url = new URL(API_IOT_WS_URL);
			if (roomIdParam) {
				url.searchParams.set("roomId", roomIdParam);
			}

			socket = new window.WebSocket(url.toString());

			socket.onmessage = (event) => {
				const parsed = parseSocketMessage(event.data);
				if (!parsed) {
					return;
				}

				if (parsed.type === "iot:error") {
					setError(parsed.error || "IoT stream error");
					setDevicesError("Khong the lay danh sach device tu App Core IoT");
					setLoading(false);
					setDevicesLoading(false);
					return;
				}

				if (parsed.type === "iot:data" && parsed.payload) {
					const nextPayload = parsed.payload;
					
					// Log device state changes for debugging
					if (payload?.switches?.length > 0 && nextPayload?.switches?.length > 0) {
						const oldSwitches = new Map(payload.switches.map(s => [s.key, s.status]));
						const newSwitches = new Map(nextPayload.switches.map(s => [s.key, s.status]));
						
						newSwitches.forEach((newStatus, key) => {
							const oldStatus = oldSwitches.get(key);
							if (oldStatus && oldStatus !== newStatus) {
								console.log("Device state changed:", { key, oldStatus, newStatus });
							}
						});
					}
					
					const nextDevices = mapPayloadToDevices({
						payload: nextPayload,
						nameOverrides: nameOverridesRef.current,
						hiddenDeviceIds: hiddenDeviceIdsRef.current,
					});

					setPayload(nextPayload);
					setDeviceList(nextDevices);
					setDevicesError("");
					setError("");
					setLoading(false);
					setDevicesLoading(false);
				}
			};

			socket.onerror = () => {
				setError("WebSocket connection error");
				setDevicesError("Khong the lay danh sach device tu App Core IoT");
				setLoading(false);
				setDevicesLoading(false);
			};

			socket.onclose = () => {
				if (closed) {
					return;
				}

				reconnectTimer = window.setTimeout(connect, 3000);
			};
		};

		connect();

		return () => {
			closed = true;
			if (reconnectTimer) {
				window.clearTimeout(reconnectTimer);
			}
			if (socket && socket.readyState < 2) {
				socket.close();
			}
		};
	}, [roomIdParam]);

	useEffect(() => {
		if (!payload) {
			return;
		}

		const nextDevices = mapPayloadToDevices({
			payload,
			nameOverrides,
			hiddenDeviceIds,
		});
		setDeviceList(nextDevices);
	}, [hiddenDeviceIds, nameOverrides, payload]);

	const handleToggleDevice = async (id) => {
		// Prevent duplicate toggle requests for same device
		if (toggleInProgressRef.current.has(id)) {
			console.warn("Toggle already in progress for device:", id);
			return;
		}

		try {
			const device = deviceList.find((d) => d.id === id);
			if (!device) return;

			const oldStatus = device.status;
			const newStatus = oldStatus === "on" ? "off" : "on";
			const newValue = newStatus === "on" ? "1" : "0";
			const key = id.startsWith("switch-") ? id.replace("switch-", "") : id;

			console.log("Toggling device:", { id, key, oldStatus, newStatus });
			setDevicesError("");

			// Mark toggle as in-progress
			toggleInProgressRef.current.add(id);

			// If device is not connected to IoT, only update local UI
			if (!device.isConnected) {
				setDevicesError("Thiết bị chưa kết nối IoT, trạng thái sẽ cập nhật khi có dữ liệu từ server.");
				toggleInProgressRef.current.delete(id);
				return;
			}

			// For connected devices, send control to IoT server
			const response = await fetch(API_IOT_CONTROL_URL, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ key, value: newValue }),
			});

			const result = await response.json();
			
			if (!response.ok) {
				const errorMsg = result?.error || result?.message || "Không thể điều khiển thiết bị";
				console.error("Control device failed:", { id, key, status: response.status, error: errorMsg });
				setDevicesError(`Lỗi: ${errorMsg}`);
				toggleInProgressRef.current.delete(id);
				return;
			}

			console.log("Control command sent successfully:", { id, key, value: newValue, response: result });

			// Do not update UI optimistically. UI state must follow server telemetry only.

			// Mark as no longer in progress after a small delay
			setTimeout(() => {
				toggleInProgressRef.current.delete(id);
			}, 500);
		} catch (err) {
			console.error("Toggle device error:", { id, error: err.message });
			setDevicesError(`Lỗi kết nối: ${err.message}`);
			toggleInProgressRef.current.delete(id);
		}
	};

	const handleModifyDevice = (id) => {
		const device = deviceList.find((d) => d.id === id);
		if (!device || typeof window === "undefined") return;

		const nextName = window.prompt("Enter new device name", device.name || "");
		if (nextName === null) return;

		const trimmedName = nextName.trim();
		if (!trimmedName) return;

		setNameOverrides((prev) => ({
			...prev,
			[id]: trimmedName,
		}));
		setDeviceList((prev) => prev.map((item) => (item.id === id ? { ...item, name: trimmedName } : item)));
	};

	const handleDeleteDevice = (id) => {
		const device = deviceList.find((d) => d.id === id);
		if (!device || typeof window === "undefined") return;

		const confirmed = window.confirm(`Delete ${device.name}?`);
		if (!confirmed) return;

		setHiddenDeviceIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
		setDeviceList((prev) => prev.filter((item) => item.id !== id));
	};

	const handleAddDevice = async () => {
		if (!IS_BROWSER) return;

		// Input device type
		const typeInput = window.prompt("Device type (fan, ac, lights, dryer...)", "fan");
		if (typeInput === null) return;

		const type = typeInput.trim() || "switch";
		// Use roomIdParam from URL first, fallback to environment variable
		const roomIdCandidate = roomIdParam ?? process.env.REACT_APP_IOT_DEFAULT_ROOM_ID;
		const roomId = Number(roomIdCandidate);
		if (!Number.isInteger(roomId) || roomId <= 0) {
			setDevicesError("Please select a room first or configure REACT_APP_IOT_DEFAULT_ROOM_ID.");
			return;
		}

		setDevicesError("");
		try {
			const response = await fetch(`${API_BASE_URL}/api/iot/rooms/${roomId}/switches`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ type }),
			});

			const result = await response.json().catch(() => ({}));
			if (!response.ok) {
				setDevicesError(result.error || "Cannot add device");
				return;
			}

			const newSwitch = result?.switch;
			if (!newSwitch?.key) {
				setDevicesError("Device created but payload is invalid");
				return;
			}

			setDeviceList((prev) => {
				if (prev.some((item) => item.id === `switch-${newSwitch.key}`)) {
					return prev;
				}

				return [
					...prev,
					{
						id: `switch-${newSwitch.key}`,
						name: newSwitch.name || newSwitch.key,
						deviceName: newSwitch.name || newSwitch.key,
						deviceId: newSwitch.deviceId ?? null,
						deviceKey: newSwitch.key,
						type: toUiType(newSwitch.type, newSwitch.name || newSwitch.key),
						status: "off",
						isConnected: true,
					},
				];
			});
		} catch (err) {
			setDevicesError(`Lỗi kết nối: ${err.message}`);
		}
	};

	return {
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
	};
}
