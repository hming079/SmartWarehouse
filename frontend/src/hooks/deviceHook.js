import { useEffect, useState } from "react";
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
const API_IOT_DATA_URL = `${API_BASE_URL}/api/iot/data`;
const API_IOT_CONTROL_URL = `${API_BASE_URL}/api/iot/control`;
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

const setDeviceStatusById = (setDeviceList, id, status) => {
	setDeviceList((prev) =>
		prev.map((device) => (device.id === id ? { ...device, status } : device)),
	);
};

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

	useEffect(() => {
		writeStoredValue(DEVICE_NAME_OVERRIDES_KEY, nameOverrides);
	}, [nameOverrides]);

	useEffect(() => {
		writeStoredValue(DEVICE_HIDDEN_IDS_KEY, hiddenDeviceIds);
	}, [hiddenDeviceIds]);

	useEffect(() => {
		let alive = true;

		async function loadData() {
			try {
				setLoading(true);
				setError("");

				const url = new URL(API_IOT_DATA_URL);
				if (roomIdParam) {
					url.searchParams.append("roomId", roomIdParam);
				}

				const res = await fetch(url.toString());
				if (!res.ok) {
					throw new Error("Request failed with status " + res.status);
				}

				const json = await res.json();
				if (alive) {
					setPayload(json);
					setDeviceList(
						applyLocalChanges(
							buildTelemetrySensors(json?.data, json?.deviceStatus, json?.switches),
							nameOverrides,
							hiddenDeviceIds,
						),
					);
					setDevicesError("");
				}
			} catch (err) {
				if (alive) {
					setError(err.message || "Failed to fetch data");
					setDevicesError("Khong the lay danh sach device tu App Core IoT");
				}
			} finally {
				if (alive) {
					setLoading(false);
					setDevicesLoading(false);
				}
			}
		}

		loadData();
		const timer = setInterval(loadData, 5000);

		return () => {
			alive = false;
			clearInterval(timer);
		};
	}, [hiddenDeviceIds, nameOverrides, roomIdParam]);

	const handleToggleDevice = async (id) => {
		try {
			const device = deviceList.find((d) => d.id === id);
			if (!device) return;

			const newStatus = device.status === "on" ? "off" : "on";
			const newValue = newStatus === "on" ? "1" : "0";
			const key = id.startsWith("switch-") ? id.replace("switch-", "") : id;

			setDevicesError("");

			// If device is not connected to IoT, only update local UI
			if (!device.isConnected) {
				setDeviceStatusById(setDeviceList, id, newStatus);
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
				setDevicesError(`Lỗi: ${result.error || "Không thể điều khiển thiết bị"}`);
				return;
			}

			setDeviceStatusById(setDeviceList, id, newStatus);
		} catch (err) {
			setDevicesError(`Lỗi kết nối: ${err.message}`);
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
