const actionLogger = require("../action-logger/action-logger.service");
const automationService = require("./automation.service");

async function getRules(req, res, next) {
  try {
    const data = await automationService.listRules();
    res.status(200).json({ ok: true, data });
  } catch (err) {
    next(err);
  }
}

async function postRule(req, res, next) {
  try {
    const {
      name,
      apply_to,
      threshold_id,
      action_id,
      food_type_id,
      target_device_id,
      is_active,
    } = req.body;

    const thresholdId = Number(threshold_id);
    const actionId = Number(action_id);

    if (!name || !String(name).trim()) {
      return res.status(400).json({ ok: false, message: "name is required" });
    }

    if (!apply_to || !String(apply_to).trim()) {
      return res
        .status(400)
        .json({ ok: false, message: "apply_to is required" });
    }

    if (!Number.isInteger(thresholdId) || thresholdId <= 0) {
      return res.status(400).json({
        ok: false,
        message: "threshold_id must be a positive integer",
      });
    }

    if (!Number.isInteger(actionId) || actionId <= 0) {
      return res
        .status(400)
        .json({ ok: false, message: "action_id must be a positive integer" });
    }

    if (
      food_type_id !== undefined &&
      food_type_id !== null &&
      (!Number.isInteger(Number(food_type_id)) || Number(food_type_id) <= 0)
    ) {
      return res.status(400).json({
        ok: false,
        message: "food_type_id must be a positive integer",
      });
    }

    if (
      target_device_id !== undefined &&
      target_device_id !== null &&
      (!Number.isInteger(Number(target_device_id)) ||
        Number(target_device_id) <= 0)
    ) {
      return res.status(400).json({
        ok: false,
        message: "target_device_id must be a positive integer",
      });
    }

    const createdRule = await automationService.createRule({
      name: String(name).trim(),
      apply_to: String(apply_to).trim(),
      threshold_id: thresholdId,
      action_id: actionId,
      food_type_id,
      target_device_id,
      is_active,
    });

    await actionLogger.logAction({
      code: "CREATE_AUTOMATION_RULE",
      name: "Create Automation Rule",
      targetType: "AUTOMATION_RULE",
      targetId: createdRule.rule_id,
      newValue: req.body,
      actorUserId: req.user?.user_id,
    });

    res.status(201).json({
      ok: true,
      message: "Rule created",
      data: createdRule,
    });
  } catch (err) {
    next(err);
  }
}

async function patchToggleRule(req, res, next) {
  try {
    const ruleId = Number(req.params.id);
    if (!Number.isInteger(ruleId) || ruleId <= 0) {
      return res
        .status(400)
        .json({ ok: false, message: "rule id is required" });
    }

    const data = await automationService.toggleRule(ruleId);
    if (!data) {
      return res.status(404).json({ ok: false, message: "Rule not found" });
    }

    res.status(202).json({
      ok: true,
      message: "Rule status updated",
      data,
    });
  } catch (err) {
    next(err);
  }
}

async function removeRule(req, res, next) {
  try {
    const ruleId = Number(req.params.id);
    if (!Number.isInteger(ruleId) || ruleId <= 0) {
      return res
        .status(400)
        .json({ ok: false, message: "rule id is required" });
    }

    await automationService.deleteRule(ruleId);
    await actionLogger.logAction({
      code: "DELETE_AUTOMATION_RULE",
      name: "Delete Automation Rule",
      targetType: "AUTOMATION_RULE",
      targetId: ruleId,
      actorUserId: req.user?.user_id,
    });
    res.status(200).json({ ok: true, message: "Rule deleted" });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getRules,
  postRule,
  patchToggleRule,
  removeRule,
};
