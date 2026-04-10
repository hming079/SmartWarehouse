async function getSettings() {
  return {
    notifications: true,
    telemetryIntervalSeconds: 5,
    timezone: "Asia/Ho_Chi_Minh",
  };
}

async function updateSettings(payload) {
  return {
    ...payload,
    updated: true,
  };
}

async function getNotificationChannels() {
  return {
    channels: ["APP", "EMAIL", "SMS"],
    enabled: ["APP"],
  };
}

async function updateIntegration(payload) {
  return {
    ...payload,
    integrationUpdated: true,
  };
}

module.exports = {
  getSettings,
  updateSettings,
  getNotificationChannels,
  updateIntegration,
};
