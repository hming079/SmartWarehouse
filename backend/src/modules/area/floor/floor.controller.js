const floorService = require("./floor.service");

async function getFloors(req, res, next) {
  try {
    const zoneId = req.query.zoneId ? Number(req.query.zoneId) : null;

    const data = await floorService.listFloors(zoneId);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

async function postFloor(req, res, next) {
  try {
    const { zone_id, floor_number } = req.body;

    if (!zone_id || floor_number === undefined || floor_number === null) {
      return res
        .status(400)
        .json({ message: "zone_id and floor_number are required" });
    }

    const data = await floorService.createFloor({ zone_id, floor_number });
    res.status(201).json(data);
  } catch (err) {
    next(err);
  }
}

async function patchFloor(req, res, next) {
  try {
    const floorId = Number(req.params.id);
    const { zone_id, floor_number } = req.body;

    if (!floorId) {
      return res.status(400).json({ message: "floor id is required" });
    }

    if (!zone_id || floor_number === undefined || floor_number === null) {
      return res
        .status(400)
        .json({ message: "zone_id and floor_number are required" });
    }

    const data = await floorService.updateFloor(floorId, {
      zone_id,
      floor_number,
    });
    res.json(data);
  } catch (err) {
    next(err);
  }
}

async function removeFloor(req, res, next) {
  try {
    const floorId = Number(req.params.id);
    if (!floorId) {
      return res.status(400).json({ message: "floor id is required" });
    }

    await floorService.deleteFloor(floorId);
    res.json({ message: "Floor deleted" });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getFloors,
  postFloor,
  patchFloor,
  removeFloor,
};
