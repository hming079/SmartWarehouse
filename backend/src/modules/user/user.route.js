const express = require("express");
const userController = require("./user.controller");
const requireRole = require("../../middleware/requireRole");

const router = express.Router();

router.get("/", requireRole(["manager"]), userController.listUsers);
router.post("/", requireRole(["manager"]), userController.createUser);

module.exports = router;
