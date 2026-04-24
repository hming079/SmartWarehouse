const express = require("express");
const foodTypeController = require("./food-type.controller");

const router = express.Router();

router.get("/", foodTypeController.getFoodTypes);

module.exports = router;
