// PATCH /automation/:id - update automation rule
async function patchUpdateRule(req, res, next) {
  try {
    const ruleId = Number(req.params.id);
    if (!ruleId) {
      return res.status(400).json({ message: "rule id is required" });
    }
    const {
      name,
      apply_to,
      food_type,
      metric,
      compare_op,
      threshold_value,
      action_name,
      action_device_ids,
      action_device_types,
      alert_level,
    } = req.body;

    if (
      !name ||
      !apply_to ||
      !food_type ||
      !metric ||
      !compare_op ||
      threshold_value === undefined ||
      threshold_value === null ||
      (!action_name && !alert_level) ||
      !alert_level
    ) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const data = await automationService.updateRule(ruleId, req.body);
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
      apply_to,
      food_type,
      metric,
      compare_op,
      threshold_value,
      action_name,
      action_device_ids,
      action_device_types,
      alert_level,
    } = req.body;

    if (
      !name ||
      !apply_to ||
      !food_type ||
      !metric ||
      !compare_op ||
      threshold_value === undefined ||
      threshold_value === null ||
      (!action_name && !alert_level) || // allow action_name to be empty if alert_level is set
      !alert_level
    ) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const data = await automationService.createRule(req.body);
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
