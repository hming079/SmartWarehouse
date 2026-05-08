// PATCH /automation/:id - update automation rule
async function patchUpdateRule(req, res, next) {
  try {
    const ruleId = Number(req.params.id);
    if (!ruleId) {
      return res.status(400).json({ message: "rule id is required" });
    }

    const {
      name,
      room_id,
      metric,
      compare_op,
      threshold_value,
      action_id,
      device_ids,
      alert_level,
      is_active,
      // action mode (on/off) for direct device actions
      action_mode,
      // Legacy fields
      apply_to,
      food_type,
      action_name,
      action_device_ids,
      action_device_types,
    } = req.body;

    // Validate required fields
    if (
      !name ||
      !metric ||
      !compare_op ||
      threshold_value === undefined ||
      threshold_value === null ||
      !alert_level
    ) {
      return res.status(400).json({ message: "Missing required fields: name, metric, compare_op, threshold_value, alert_level" });
    }

    const payload = {
      name,
      room_id: room_id || null,
      metric,
      compare_op,
      threshold_value: Number(threshold_value),
      action_id: action_id || null,
      action_mode: action_mode || null,
      device_ids: Array.isArray(device_ids) ? device_ids : [],
      alert_level,
      is_active: is_active !== undefined ? is_active : true,
      // Keep legacy fields if provided
      apply_to: apply_to || null,
      food_type: food_type || null,
      action_name: action_name || null,
      action_device_ids: action_device_ids || null,
      action_device_types: action_device_types || null,
    };

    const data = await automationService.updateRule(ruleId, payload);
    res.json(data);
  } catch (err) {
    next(err);
  }
}
const automationService = require("./automation.service");

async function getRules(req, res, next) {
  try {
    const data = await automationService.listRules();
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

async function postRule(req, res, next) {
  try {
    const {
      name,
      room_id,
      metric,
      compare_op,
      threshold_value,
      action_id,
      device_ids,
      alert_level,
      is_active,
      // action mode (on/off) for direct device actions
      action_mode,
      // Legacy fields
      apply_to,
      food_type,
      action_name,
      action_device_ids,
      action_device_types,
    } = req.body;

    // Validate required fields
    if (
      !name ||
      !metric ||
      !compare_op ||
      threshold_value === undefined ||
      threshold_value === null ||
      !alert_level
    ) {
      return res.status(400).json({ message: "Missing required fields: name, metric, compare_op, threshold_value, alert_level" });
    }

    const payload = {
      name,
      room_id: room_id || null,
      metric,
      compare_op,
      threshold_value: Number(threshold_value),
      action_id: action_id || null,
      action_mode: action_mode || null,
      device_ids: Array.isArray(device_ids) ? device_ids : [],
      alert_level,
      is_active: is_active !== undefined ? is_active : true,
      // Keep legacy fields if provided
      apply_to: apply_to || null,
      food_type: food_type || null,
      action_name: action_name || null,
      action_device_ids: action_device_ids || null,
      action_device_types: action_device_types || null,
    };

    const data = await automationService.createRule(payload);
    res.status(201).json(data);
  } catch (err) {
    next(err);
  }
}

async function patchToggleRule(req, res, next) {
  try {
    const ruleId = Number(req.params.id);
    if (!ruleId) {
      return res.status(400).json({ message: "rule id is required" });
    }

    const data = await automationService.toggleRule(ruleId);
    if (!data) {
      return res.status(404).json({ message: "Rule not found" });
    }

    res.json(data);
  } catch (err) {
    next(err);
  }
}

async function removeRule(req, res, next) {
  try {
    const ruleId = Number(req.params.id);
    if (!ruleId) {
      return res.status(400).json({ message: "rule id is required" });
    }

    await automationService.deleteRule(ruleId);
    res.json({ message: "Rule deleted" });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getRules,
  postRule,
  patchToggleRule,
  removeRule,
  patchUpdateRule,
};
