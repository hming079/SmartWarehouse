const sensorsService = require("./sensors.service");

async function getSensors(req, res, next) {
  try {
    const filters = {
      zoneId: req.query.zoneId ? Number(req.query.zoneId) : null,
      floorId: req.query.floorId ? Number(req.query.floorId) : null,
      roomId: req.query.roomId ? Number(req.query.roomId) : null,
      type: req.query.type || null,
      status: req.query.status || null,
      search: req.query.search || null,
    };

    const pagination = {
      page: Math.max(1, Number(req.query.page) || 1),
      limit: Math.max(1, Number(req.query.limit) || 20),
    };

    const data = await sensorsService.listSensors(filters, pagination);

    res.json({
      ok: true,
      data: data.items,
      meta: {
        filters,
        pagination: data.pagination,
      },
    });
  } catch (error) {
    next(error);
  }
}

async function getSensorById(req, res, next) {
  try {
    const sensorId = Number(req.params.id);
    if (!sensorId) {
      return res.status(400).json({ message: "Sensor ID is required" });
    }
    const data = await sensorsService.getSensorById(sensorId);
    if (!data) {
      return res.status(404).json({ message: "Sensor not found" });
    }
    res.json({ ok: true, data });
  } catch (error) {
    next(error);
  }
}

async function updateSensor(req, res, next) {
  try {
    const sensorId = Number(req.params.id);
    if (!sensorId) {
      return res.status(400).json({ message: "Sensor ID is required" });
    }
    const data = await sensorsService.updateSensor(sensorId, req.body || {});
    if (!data) {
      return res.status(404).json({ message: "Sensor not found" });
    }
    res.json({ ok: true, data });
  } catch (error) {
    next(error);
  }
}

async function postSensor(req, res, next) {
  try {
    const data = await sensorsService.createSensor(req.body || {});
    res.status(201).json({ ok: true, data });
  }
  catch (error) {
    next(error);
  }
}

module.exports = {
  getSensors,
  postSensor,
  getSensorById,
  updateSensor,
};
