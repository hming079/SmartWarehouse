const zoneService = require("./zone.service");

async function getZones(req, res, next) {
  try {
    const locationId = Number(req.query.locationId);
    if (!locationId) {
      return res.status(400).json({ message: "locationId is required" });
    }

    const data = await zoneService.listZones(locationId);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

async function postZone(req, res, next) {
  try {
    const { location_id, name } = req.body;

    if (!location_id || !name) {
      return res
        .status(400)
        .json({ message: "location_id and name are required" });
    }

    const data = await zoneService.createZone({ location_id, name });
    res.status(201).json(data);
  } catch (err) {
    next(err);
  }
}

async function patchZone(req, res, next) {
  try {
    const zoneId = Number(req.params.id);
    const { location_id, name } = req.body;

    if (!zoneId) {
      return res.status(400).json({ message: "zone id is required" });
    }

    if (!location_id || !name) {
      return res
        .status(400)
        .json({ message: "location_id and name are required" });
    }

    const data = await zoneService.updateZone(zoneId, { location_id, name });
    res.json(data);
  } catch (err) {
    next(err);
  }
}

async function removeZone(req, res, next) {
  try {
    const zoneId = Number(req.params.id);
    if (!zoneId) {
      return res.status(400).json({ message: "zone id is required" });
    }

    await zoneService.deleteZone(zoneId);
    res.json({ message: "Zone deleted" });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getZones,
  postZone,
  patchZone,
  removeZone,
};
