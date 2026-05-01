const express = require("express");
const authController = require("./auth.controller");
const requireAuth = require("../../middleware/requireAuth");

const router = express.Router();

router.post("/login", authController.login);
router.post("/logout", requireAuth, authController.logout);
router.get("/me", requireAuth, authController.me);

module.exports = router;
