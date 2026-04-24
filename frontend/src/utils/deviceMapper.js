// Utility mappers
export const toUiStatus = (status) =>
	String(status || "").toUpperCase() === "ON" ? "on" : "off";

export const toUiType = (type, name) => {
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

export const toSwitchDevice = (item) => {
	const fallbackName = item.name || item.key || "Switch";
	const hasDbDeviceId = item.deviceId !== null && item.deviceId !== undefined;
	const fallbackKey = item.key || "unknown";

	return {
		id: hasDbDeviceId ? `switch-db-${item.deviceId}` : `switch-${fallbackKey}`,
		name: fallbackName,
		deviceName: item.deviceName || fallbackName,
		deviceId: item.deviceId ?? null,
		deviceKey: item.key || null,
		status: toUiStatus(item.status),
		type: toUiType(item.type, item.name || item.key),
		isConnected: item.isConnected !== false,
	};
};

export const toDbDevice = (item) => {
	const deviceType = String(item?.type || "").trim();
	const normalizedType = toUiType(deviceType, item?.name);
	const fallbackName =
		String(item?.name || "").trim() ||
		String(item?.device_name || "").trim() ||
		`Device ${item?.id ?? "--"}`;

	return {
		id: item?.id !== undefined && item?.id !== null ? `db-${item.id}` : `db-${fallbackName}`,
		name: fallbackName,
		deviceName: fallbackName,
		deviceId: item?.id ?? null,
		deviceKey: deviceType || normalizedType,
		status: toUiStatus(item?.status),
		type: normalizedType,
		isConnected: false,
	};
};

export const mergeDevicesByDeviceId = (iotDevices, dbDevices) => {
	const merged = [...(Array.isArray(iotDevices) ? iotDevices : [])];

	(dbDevices || []).forEach((dbDevice) => {
		const dbId = dbDevice?.deviceId;
		if (dbId === null || dbId === undefined) {
			merged.push(dbDevice);
			return;
		}

		const existingIndex = merged.findIndex(
			(item) => item?.deviceId !== null && item?.deviceId !== undefined && Number(item.deviceId) === Number(dbId),
		);

		if (existingIndex === -1) {
			merged.push(dbDevice);
			return;
		}

		const existing = merged[existingIndex];
		merged[existingIndex] = {
			...dbDevice,
			...existing,
			deviceName: existing.deviceName || dbDevice.deviceName,
			name: existing.name || dbDevice.name,
		};
	});
	return merged;
};
