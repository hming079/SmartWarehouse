import { useEffect, useState } from "react";

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

const buildTelemetryDevices = (data, deviceStatus, switches = []) => {
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

export function useDeviceData() {
	const [deviceList, setDeviceList] = useState([]);
	const [devicesLoading, setDevicesLoading] = useState(true);
	const [devicesError, setDevicesError] = useState("");
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [payload, setPayload] = useState(null);

	useEffect(() => {
		let alive = true;

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
						buildTelemetryDevices(json?.data, json?.deviceStatus, json?.switches),
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
	}, []);

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

	return {
		deviceList,
		devicesLoading,
		devicesError,
		loading,
		error,
		payload,
		handleToggleDevice,
	};
}
