const thresholdsService = require("./thresholds.service");

function parseOptionalBool(value) {
  if (value === undefined || value === null || value === "") return null;
  const normalized = String(value).trim().toLowerCase();
  if (["true", "1", "yes", "on"].includes(normalized)) return true;
  if (["false", "0", "no", "off"].includes(normalized)) return false;
  return undefined;
}

function getActorUserId(req) {
  const candidates = [
    req.user?.user_id,
    req.user?.id,
    req.userId,
    req.body?.actorUserId,
  ];
  for (const candidate of candidates) {
    const n = Number(candidate);
    if (Number.isInteger(n) && n > 0) return n;
  }
  return null;
}

async function getThresholds(req, res, next) {
  try {
    const isActive = parseOptionalBool(req.query.isActive);
    if (isActive === undefined) {
      return res.status(400).json({
        ok: false,
        error: "isActive must be true/false/1/0",
      });
    }

    const filters = {
      roomId: req.query.roomId ? Number(req.query.roomId) : null,
      sensorId: req.query.sensorId ? Number(req.query.sensorId) : null,
      isActive,
    };

    const data = await thresholdsService.listThresholds(filters);
    res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
}

async function postThreshold(req, res, next) {
  try {
    const actorUserId = getActorUserId(req);
    const data = await thresholdsService.createThreshold(req.body || {}, {
      actorUserId,
    });
    res.status(201).json({ ok: true, data });
  } catch (err) {
    next(err);
  }
}

async function patchThreshold(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ ok: false, error: "Invalid threshold id" });
    }

    const payload = req.body || {};
    const payloadKeys = Object.keys(payload);

    // Accept only max_value to keep this endpoint focused on a single update intent.
    if (
      payloadKeys.length !== 1 ||
      !Object.prototype.hasOwnProperty.call(payload, "max_value")
    ) {
      return res.status(400).json({
        ok: false,
        error: "Payload must contain only max_value",
      });
    }

    const maxValue = Number(payload.max_value);
    if (!Number.isFinite(maxValue)) {
      return res.status(400).json({
        ok: false,
        error: "max_value must be a valid number",
      });
    }

    const actorUserId = getActorUserId(req);
    const data = await thresholdsService.updateThreshold(
      id,
      { max_value: maxValue },
      {
        actorUserId,
      },
    );

    res.status(200).json({
      ok: true,
      message: "Cập nhật ngưỡng thành công",
      data: {
        id: data.id,
        max_value: data.max_value,
      },
    });
  } catch (err) {
    next(err);
  }
}

async function deleteThreshold(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ ok: false, error: "Invalid threshold id" });
    }

    const actorUserId = getActorUserId(req);
    await thresholdsService.deleteThreshold(id, { actorUserId });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getThresholds,
  postThreshold,
  patchThreshold,
  deleteThreshold,
};
