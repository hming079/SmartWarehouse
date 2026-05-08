const actionsService = require("./actions.service");

async function getActions(req, res, next) {
  try {
    const data = await actionsService.listActions();
    res.json({ ok: true, data });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getActions,
};
