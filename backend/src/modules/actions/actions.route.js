const express = require("express");
const actionsController = require("./actions.controller");

const router = express.Router();

router.get("/", actionsController.getActions);

module.exports = router;
