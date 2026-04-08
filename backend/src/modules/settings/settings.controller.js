const settingsService = require("./settings.service");

async function getSystemSettings(req, res, next) {
  try {
    const data = await settingsService.getSettings();
    res.json({ ok: true, data });
  } catch (error) {
    next(error);
  }
}

async function patchSystemSettings(req, res, next) {
  try {
    const data = await settingsService.updateSettings(req.body || {});
    res.json({ ok: true, data });
  } catch (error) {
    next(error);
  }
}

async function getNotificationChannels(req, res, next) {
  try {
    const data = await settingsService.getNotificationChannels();
    res.json({ ok: true, data });
  } catch (error) {
    next(error);
  }
}

async function patchIntegrationSettings(req, res, next) {
  try {
    const data = await settingsService.updateIntegration(req.body || {});
    res.json({ ok: true, data });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getSystemSettings,
  patchSystemSettings,
  getNotificationChannels,
  patchIntegrationSettings,
};
