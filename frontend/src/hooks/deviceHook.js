import { useEffect, useState } from "react";


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

// Telemetry transformation
const buildTelemetrySensors = (data, deviceStatus, switches = []) => {
	const tempValue = Number(data?.temperature?.[0]?.value ?? NaN);
	const humValue = Number(data?.humidity?.[0]?.value ?? NaN);
	const status = toUiStatus(deviceStatus);

	const switchDevices = Array.isArray(switches)
		? switches.map((item) => ({
				id: `switch-${item.key}`,
				name: item.name || item.key || "Switch",
				status: toUiStatus(item.status),
				type: toUiType(item.type, item.name || item.key),
			}))
		: [];

	if (switchDevices.length > 0) {
		return switchDevices;
	}

	return [
		{
			id: "telemetry-temperature",
			name: Number.isNaN(tempValue) ? "Temperature" : `Temperature (${tempValue.toFixed(1)} C)`,
			status,
			type: "temperature",
		},
		{
			id: "telemetry-humidity",
			name: Number.isNaN(humValue) ? "Humidity" : `Humidity (${humValue.toFixed(1)}%)`,
			status,
			type: "humidity",
		},
	];
};

const API_PORT = process.env.REACT_APP_API_PORT || "5001";
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || `http://localhost:${API_PORT}`;
const DEVICE_NAME_OVERRIDES_KEY = "smartwarehouse.device-name-overrides";
const DEVICE_HIDDEN_IDS_KEY = "smartwarehouse.device-hidden-ids";

const readStoredValue = (key, fallback) => {
	if (typeof window === "undefined") {
		return fallback;
	}

	try {
		const raw = window.localStorage.getItem(key);
		return raw ? JSON.parse(raw) : fallback;
	} catch (_) {
		return fallback;
	}
};

export function useDeviceData() {
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
		if (typeof window === "undefined") {
			return;
		}

		window.localStorage.setItem(DEVICE_NAME_OVERRIDES_KEY, JSON.stringify(nameOverrides));
	}, [nameOverrides]);

	useEffect(() => {
		if (typeof window === "undefined") {
			return;
		}

		window.localStorage.setItem(DEVICE_HIDDEN_IDS_KEY, JSON.stringify(hiddenDeviceIds));
	}, [hiddenDeviceIds]);

	useEffect(() => {
		let alive = true;

		const applyLocalChanges = (devices) =>
			devices
				.map((device) => ({
					...device,
					name: nameOverrides[device.id] || device.name,
				}))
				.filter((device) => !hiddenDeviceIds.includes(device.id));

		async function loadData() {
			try {
				setLoading(true);
				setError("");

				const res = await fetch(`${API_BASE_URL}/api/iot/data`);
				if (!res.ok) {
					throw new Error("Request failed with status " + res.status);
				}

				const json = await res.json();
				console.log(json);
				if (alive) {
					setPayload(json);
					setDeviceList(
						applyLocalChanges(buildTelemetrySensors(json?.data, json?.deviceStatus, json?.switches)),
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
	}, [hiddenDeviceIds, nameOverrides]);

	const handleToggleDevice = async (id) => {
		try {
			const device = deviceList.find((d) => d.id === id);
			if (!device) return;

			const newStatus = device.status === "on" ? "off" : "on";
			const newValue = newStatus === "on" ? "1" : "0";
			const key = id.startsWith("switch-") ? id.replace("switch-", "") : id;

			setDevicesError("");

			const response = await fetch(`${API_BASE_URL}/api/iot/control`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ key, value: newValue }),
			});

			const result = await response.json();
			if (!response.ok) {
				setDevicesError(`Lỗi: ${result.error || "Không thể điều khiển thiết bị"}`);
				return;
			}

			setDeviceList((prev) =>
				prev.map((d) => (d.id === id ? { ...d, status: newStatus } : d)),
			);
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
		if (typeof window === "undefined") return;

		// Input device type
		const typeInput = window.prompt("Device type (fan, ac, lights, dryer...)", "fan");
		if (typeInput === null) return;

		const type = typeInput.trim() || "switch";
		const roomIdCandidate = payload?.roomId ?? process.env.REACT_APP_IOT_DEFAULT_ROOM_ID;
		const roomId = Number(roomIdCandidate);
		if (!Number.isInteger(roomId) || roomId <= 0) {
			setDevicesError("Missing roomId. Configure IOT_DEFAULT_ROOM_ID on backend or REACT_APP_IOT_DEFAULT_ROOM_ID on frontend.");
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
						type: toUiType(newSwitch.type, newSwitch.name || newSwitch.key),
						status: "off",
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
