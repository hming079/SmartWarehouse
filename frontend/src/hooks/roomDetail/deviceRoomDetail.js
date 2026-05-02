import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../../api";
import { toUiStatus, toUiType, toDbDevice, toSwitchDevice, mergeDevicesByDeviceId  } from "../../utils/deviceMapper"

const IS_BROWSER = typeof window !== "undefined";
const PENDING_STATUS_TTL_MS = 5000;


export const createTelemetryDevice = ({ id, label, value, status, unit, type }) => ({
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
export const buildTelemetrySensors = (data, deviceStatus, switches = []) => {
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
const IOT_CONTROL_DEVICE_IDS = String(process.env.REACT_APP_IOT_CONTROL_DEVICE_IDS || "15,16,17")
	.split(",")
	.map((item) => Number(String(item).trim()))
	.filter((value) => Number.isInteger(value) && value > 0);
const IOT_RPC_KEY_BY_DEVICE_ID = String(
	process.env.REACT_APP_IOT_RPC_KEY_BY_DEVICE_ID || "15:fan_on,16:cooler_on,17:dryer_on",
)
	.split(",")
	.map((item) => String(item || "").trim())
	.filter(Boolean)
	.reduce((acc, pair) => {
		const [rawId, rawKey] = pair.split(":").map((part) => String(part || "").trim().toLowerCase());
		const id = Number(rawId);
		if (!Number.isInteger(id) || id <= 0) {
			return acc;
		}
		if (["fan_on", "cooler_on", "dryer_on"].includes(rawKey)) {
			acc[id] = rawKey;
		}
		return acc;
	}, {});
const DEVICE_NAME_OVERRIDES_KEY = "smartwarehouse.device-name-overrides";
const DEVICE_HIDDEN_IDS_KEY = "smartwarehouse.device-hidden-ids";
const DEVICE_TYPE_OPTIONS = ["fan", "dryer", "ac", "lights"];

const IOT_RPC_KEY_BY_TYPE = {
	fan: "fan_on",
	dryer: "dryer_on",
	ac: "cooler_on",
};

const canControlViaIot = (device) => {
	const id = Number(device?.deviceId);
	return Number.isInteger(id) && IOT_CONTROL_DEVICE_IDS.includes(id);
};
export const fetchDbDevices = async (roomIdParam) => {
	const dbJson = await api.getDevices(roomIdParam);
	return Array.isArray(dbJson?.data) ? dbJson.data.map(toDbDevice) : [];
};
const resolveIotControlKey = (device, fallbackId) => {
	const deviceId = Number(device?.deviceId);
	if (Number.isInteger(deviceId) && IOT_RPC_KEY_BY_DEVICE_ID[deviceId]) {
		return IOT_RPC_KEY_BY_DEVICE_ID[deviceId];
	}

	const rawKey = String(device?.deviceKey || "").trim().toLowerCase();
	if (["fan_on", "cooler_on", "dryer_on"].includes(rawKey)) {
		return rawKey;
	}

	const mappedByType = IOT_RPC_KEY_BY_TYPE[toUiType(device?.type, device?.name)];
	if (mappedByType) {
		return mappedByType;
	}

	if (String(fallbackId || "").startsWith("switch-")) {
		const switchKey = String(fallbackId).replace("switch-", "").toLowerCase();
		if (["fan_on", "cooler_on", "dryer_on"].includes(switchKey)) {
			return switchKey;
		}
	}

	return null;
};

const buildIotControlKeyCandidates = (device, fallbackId) => {
	const candidates = [];
	const pushUnique = (value) => {
		const normalized = String(value || "").trim().toLowerCase();
		if (!normalized) return;
		if (!candidates.includes(normalized)) {
			candidates.push(normalized);
		}
	};

	pushUnique(resolveIotControlKey(device, fallbackId));
	pushUnique(device?.deviceKey);

	const mappedByType = IOT_RPC_KEY_BY_TYPE[toUiType(device?.type, device?.name)];
	pushUnique(mappedByType);

	return candidates.filter((key) => ["fan_on", "cooler_on", "dryer_on"].includes(key));
};

const normalizeSelectableDeviceType = (rawType) => {
	const normalized = String(rawType || "").trim().toLowerCase();
	if (!normalized) return null;

	if (["ac", "cool", "cooler", "cooling", "air", "aircon"].includes(normalized)) {
		return "ac";
	}
	if (["light", "lights", "lamp"].includes(normalized)) {
		return "lights";
	}
	if (["dryer", "dry"].includes(normalized)) {
		return "dryer";
	}
	if (["fan", "vent"].includes(normalized)) {
		return "fan";
	}

	return DEVICE_TYPE_OPTIONS.includes(normalized) ? normalized : null;
};

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
		.filter((device) => {
			// Never hide DB-backed devices via local cache; they should always reflect DB state.
			if (device?.deviceId !== null && device?.deviceId !== undefined) {
				return true;
			}

			return !hiddenSet.has(device.id);
		});
};

const setDeviceStatusById = (setDeviceList, id, status) => {
	setDeviceList((prev) =>
		prev.map((device) => (device.id === id ? { ...device, status } : device)),
	);
};

const reconcilePendingStatuses = (devices, pendingStatusById) => {
	const now = Date.now();
	const nextPendingStatusById = {};

	const reconciledDevices = devices.map((device) => {
		const pending = pendingStatusById[device.id];
		if (!pending || pending.expiresAt <= now) {
			return device;
		}

		if (device.status === pending.status) {
			return device;
		}

		nextPendingStatusById[device.id] = pending;
		return { ...device, status: pending.status };
	});

	return {
		devices: reconciledDevices,
		pendingStatusById: nextPendingStatusById,
	};
};
const getSetupDescription = (device) => {
  const id = Number(device?.deviceId);
  return Number.isInteger(id) && IOT_CONTROL_DEVICE_IDS.includes(id) ? "Set up" : "";
};
export function useDeviceData({ roomIdOverride } = {}) {
	const [searchParams] = useSearchParams();
	const roomIdParam = roomIdOverride ?? searchParams.get("roomId");
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
	const [pendingStatusById, setPendingStatusById] = useState({});
	const [pendingControlIds, setPendingControlIds] = useState([]);
	const pendingStatusRef = useRef(pendingStatusById);
	const lastControlAtRef = useRef(0);
	const isFetchingRef = useRef(false);

	useEffect(() => {
		pendingStatusRef.current = pendingStatusById;
	}, [pendingStatusById]);

	useEffect(() => {
		writeStoredValue(DEVICE_NAME_OVERRIDES_KEY, nameOverrides);
	}, [nameOverrides]);

	useEffect(() => {
		writeStoredValue(DEVICE_HIDDEN_IDS_KEY, hiddenDeviceIds);
	}, [hiddenDeviceIds]);

	useEffect(() => {
		let alive = true;

		async function loadData() {
			if (isFetchingRef.current) {
				return;
			}

			isFetchingRef.current = true;
			const requestStartedAt = Date.now();

			try {
				setLoading(true);
				setError("");

				const [json, dbDevices] = await Promise.all([
					api.getIotData({ roomId: roomIdParam }),
					fetchDbDevices(roomIdParam).catch(() => []),
				]);
				if (alive) {
					if (requestStartedAt < lastControlAtRef.current) {
						return;
					}

					const iotDevices = buildTelemetrySensors(
						json?.data,
						json?.deviceStatus,
						json?.switches,
					);
					const mergedDevices = mergeDevicesByDeviceId(iotDevices, dbDevices);
					const decoratedMergedDevices = mergedDevices.map((item) => ({
					...item,
					setupDescription: getSetupDescription(item),
					}));

					const localDevices = applyLocalChanges(
					decoratedMergedDevices,
					nameOverrides,
					hiddenDeviceIds,
					);

					const reconciled = reconcilePendingStatuses(
						localDevices,
						pendingStatusRef.current,
					);
					setPayload(json);
					setDeviceList(reconciled.devices);
					setPendingStatusById(reconciled.pendingStatusById);
					setDevicesError("");
				}
			} catch (err) {
				if (alive) {
					setError(err.message || "Failed to fetch data");

					try {
						const dbDevices = await fetchDbDevices(roomIdParam);

						if (requestStartedAt < lastControlAtRef.current) {
							return;
						}

						const decoratedDbDevices = dbDevices.map((item) => ({
							...item,
							setupDescription: getSetupDescription(item),
						}));
						const localDevices = applyLocalChanges(decoratedDbDevices, nameOverrides, hiddenDeviceIds);
						const reconciled = reconcilePendingStatuses(localDevices, pendingStatusRef.current);
						setPayload((prev) => prev || { ok: false, data: {}, switches: [] });
						setDeviceList(reconciled.devices);
						setPendingStatusById(reconciled.pendingStatusById);
						setDevicesError("Dang hien thi thiet bi tu database (IoT server tam thoi khong ket noi).");
					} catch (dbErr) {
						setDevicesError("Khong the lay danh sach device tu App Core IoT va database");
						setError(dbErr.message || err.message || "Failed to fetch data");
					}
				}
			} finally {
				isFetchingRef.current = false;
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
			const normalizedId = String(id ?? "");
			if (!normalizedId) {
				return;
			}

			if (pendingControlIds.some((item) => String(item) === normalizedId)) {
				return;
			}

			const device = deviceList.find((d) => String(d.id) === normalizedId);
			if (!device) return;

			const newStatus = device.status === "on" ? "off" : "on";
			const newValue = newStatus === "on" ? "1" : "0";
			const keyCandidates = buildIotControlKeyCandidates(device, normalizedId);
			lastControlAtRef.current = Date.now();
			setPendingControlIds((prev) =>
				prev.some((item) => String(item) === normalizedId) ? prev : [...prev, normalizedId],
			);

			setDevicesError("");

			// All non-whitelisted devices toggle in DB only (no IoT RPC).
			if (!canControlViaIot(device)) {
				if (device.deviceId === null || device.deviceId === undefined) {
					setDevicesError("Thiết bị chưa có deviceId trong database.");
					return;
				}

				await api.toggleDevice(device.deviceId);

				setPendingStatusById((prev) => ({
					...prev,
					[device.id]: {
						status: newStatus,
						expiresAt: Date.now() + PENDING_STATUS_TTL_MS,
					},
				}));
				setDeviceStatusById(setDeviceList, device.id, newStatus);
				return;
			}

			// Only whitelisted IoT devices send RPC.
			if (!keyCandidates.length) {
				setDevicesError("Thiết bị IoT này chưa có key RPC hợp lệ (fan_on/cooler_on/dryer_on).");
				return;
			}

			let controlResult = null;
			let controlError = null;
			const roomIdForControl = Number(roomIdParam ?? process.env.REACT_APP_IOT_DEFAULT_ROOM_ID);
			const controlPayloadBase = Number.isInteger(roomIdForControl) && roomIdForControl > 0
				? { roomId: roomIdForControl }
				: {};
			for (const candidateKey of keyCandidates) {
				try {
					controlResult = await api.controlIotDevice({
						...controlPayloadBase,
						key: candidateKey,
						value: newValue,
					});
					controlError = null;
					break;
				} catch (err) {
					controlError = err;

					// Retry only for validation/key mismatch style 400 errors.
					const errMsg = String(err?.message || err?.payload?.error || err?.payload?.message || "").toLowerCase();
					const shouldRetry =
						err?.status === 400 &&
						(errMsg.includes("unsupported control key") || errMsg.includes("missing key"));
					if (!shouldRetry) {
						break;
					}
				}
			}

			if (!controlResult) {
				if (controlError?.status === 409) {
					setPendingStatusById((prev) => ({
						...prev,
						[device.id]: {
							status: newStatus,
							expiresAt: Date.now() + PENDING_STATUS_TTL_MS,
						},
					}));
					setDeviceStatusById(setDeviceList, device.id, newStatus);
					setDevicesError("");
					return;
				}

				const statusText = controlError?.status ? ` (${controlError.status})` : "";
				setDevicesError(`Lỗi${statusText}: ${controlError?.message || "Không thể điều khiển thiết bị"}`);
				return;
			}

			setPendingStatusById((prev) => ({
				...prev,
				[device.id]: {
					status: newStatus,
					expiresAt: Date.now() + PENDING_STATUS_TTL_MS,
				},
			}));
			setDeviceStatusById(setDeviceList, device.id, newStatus);
		} catch (err) {
			setDevicesError(`Lỗi kết nối: ${err.message}`);
		} finally {
			const normalizedId = String(id ?? "");
			setPendingControlIds((prev) => prev.filter((item) => String(item) !== normalizedId));
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
		void (async () => {
		const device = deviceList.find((d) => d.id === id);
		if (!device || typeof window === "undefined") return;

		if (device.isConnected) {
			setDevicesError("Chỉ có thể xóa thiết bị không kết nối IoT.");
			return;
		}

		const confirmed = window.confirm(`Delete ${device.name}?`);
		if (!confirmed) return;

		if (device.deviceId !== null && device.deviceId !== undefined) {
			try {
				await api.deleteDevice(device.deviceId);
			} catch (err) {
				setDevicesError(err?.message || "Không thể xóa thiết bị trong DB");
				return;
			}
		}

		setHiddenDeviceIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
		setPendingStatusById((prev) => {
			if (!prev[id]) return prev;
			const next = { ...prev };
			delete next[id];
			return next;
		});
		setDeviceList((prev) => prev.filter((item) => item.id !== id));
		})();
	};

	const handleAddDevice = async (selectedType) => {
		if (!IS_BROWSER) return;

		const type = normalizeSelectableDeviceType(selectedType);
		if (!type) {
			setDevicesError("Invalid device type. Please use: fan, dryer, ac, lights.");
			return;
		}

		// Use roomIdParam from URL first, fallback to environment variable
		const roomIdCandidate = roomIdParam ?? process.env.REACT_APP_IOT_DEFAULT_ROOM_ID;
		const roomId = Number(roomIdCandidate);
		if (!Number.isInteger(roomId) || roomId <= 0) {
			setDevicesError("Please select a room first or configure REACT_APP_IOT_DEFAULT_ROOM_ID.");
			return;
		}

		setDevicesError("");
		try {
            const result = await api.registerIotSwitch(roomId, { type });

			const newSwitch = result?.switch;
			if (!newSwitch?.key) {
				setDevicesError("Device created but payload is invalid");
				return;
			}

			setDeviceList((prev) => {
				if (prev.some((item) => item.id === `switch-${newSwitch.key}`)) {
					return prev;
				}

				const nextDevice = {
					id: `switch-${newSwitch.key}`,
					name: newSwitch.name || newSwitch.key,
					deviceName: newSwitch.name || newSwitch.key,
					deviceId: newSwitch.deviceId ?? null,
					deviceKey: newSwitch.key,
					type: toUiType(newSwitch.type, newSwitch.name || newSwitch.key),
					status: "off",
					isConnected: true,
				};

				return [
					...prev,
					{
						...nextDevice,
						setupDescription: getSetupDescription(nextDevice),
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
		pendingControlIds,
		loading,
		error,
		payload,
		handleToggleDevice,
		handleModifyDevice,
		handleDeleteDevice,
		handleAddDevice,
	};
}
