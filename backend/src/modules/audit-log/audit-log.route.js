const express = require("express");
const auditLogController = require("./audit-log.controller");

const router = express.Router();

router.get("/", auditLogController.getAuditLogs);
router.get("/:id", auditLogController.getAuditLogById);
router.post("/export", auditLogController.postExportAuditLogs);

module.exports = router;
