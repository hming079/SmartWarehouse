const actionLogger = require("../../action-logger/action-logger.service");
const roomService = require("./room.service");

async function getRooms(req, res, next) {
  try {
    const floorId = Number(req.query.floorId);
    if (!floorId) {
      return res.status(400).json({ message: "floorId is required" });
    }

    const data = await roomService.listRooms(floorId);
    res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
}

async function postRoom(req, res, next) {
  try {
    const { floor_id, name, description } = req.body;

    if (!floor_id || !name) {
      return res
        .status(400)
        .json({ message: "floor_id and name are required" });
    }

    const data = await roomService.createRoom({ floor_id, name, description });
    await actionLogger.logAction({
      code: "CREATE_ROOM",
      name: "Create Room",
      targetType: "ROOM",
      targetId: data.room_id,
      newValue: { floor_id, name, description },
      actorUserId: req.user?.user_id,
    });
    res.status(201).json({ ok: true, data });
  } catch (err) {
    next(err);
  }
}

async function patchRoom(req, res, next) {
  try {
    const roomId = Number(req.params.id);
    const { floor_id, name, description } = req.body;

    if (!roomId) {
      return res.status(400).json({ message: "room id is required" });
    }

    if (!floor_id || !name) {
      return res
        .status(400)
        .json({ message: "floor_id and name are required" });
    }

    const data = await roomService.updateRoom(roomId, {
      floor_id,
      name,
      description,
    });
    await actionLogger.logAction({
      code: "UPDATE_ROOM",
      name: "Update Room",
      targetType: "ROOM",
      targetId: roomId,
      newValue: { floor_id, name, description },
      actorUserId: req.user?.user_id,
    });
    res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
}

async function removeRoom(req, res, next) {
  try {
    const roomId = Number(req.params.id);
    if (!roomId) {
      return res.status(400).json({ message: "room id is required" });
    }

    await roomService.deleteRoom(roomId);
    await actionLogger.logAction({
      code: "DELETE_ROOM",
      name: "Delete Room",
      targetType: "ROOM",
      targetId: roomId,
      actorUserId: req.user?.user_id,
    });
    res.json({ ok: true, message: "Room deleted" });
  } catch (err) {
    next(err);
  }
}

async function getRoomSummary(req, res, next) {
  try {
    const roomId = Number(req.params.id);
    if (!roomId) {
      return res.status(400).json({ message: "room id is required" });
    }

    const data = await roomService.getRoomSummary(roomId);
    res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
}

async function getRoomMetrics(req, res, next) {
  try {
    const roomId = Number(req.params.id);
    if (!Number.isInteger(roomId) || roomId <= 0) {
      return res.status(400).json({ message: "room id is required" });
    }

    const data = await roomService.getRoomMetrics(roomId);
    res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getRooms,
  getRoomSummary,
  getRoomMetrics,
  postRoom,
  patchRoom,
  removeRoom,
};
