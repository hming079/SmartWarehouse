const auditLogService = require("./audit-log.service");

async function getAuditLogs(req, res, next) {
  try {
    const page = Number(req.query.page || 1);
    const pageSize = Number(req.query.pageSize || 20);
    const roomId = req.query.roomId ? Number(req.query.roomId) : null;
    const data = await auditLogService.listAuditLogs({
      page,
      pageSize,
      from: req.query.from,
      to: req.query.to,
      actor: req.query.actor,
      action: req.query.action,
      roomId,
    });
    res.json({
      ok: true,
      data: data.items,
      meta: {
        page: data.page,
        pageSize: data.pageSize,
        total: data.total,
        ...data.filters,
      },
    });
  } catch (error) {
    next(error);
  }
}

async function getAuditLogById(req, res, next) {
  try {
    const data = await auditLogService.getAuditLogById(req.params.id);
    res.json({ ok: true, data });
  } catch (error) {
    next(error);
  }
}

async function postExportAuditLogs(req, res, next) {
  try {
    const data = await auditLogService.exportAuditLogs(req.body || {});
    res.status(202).json({ ok: true, data });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getAuditLogs,
  getAuditLogById,
  postExportAuditLogs,
};
