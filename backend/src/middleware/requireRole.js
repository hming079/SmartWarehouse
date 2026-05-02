function requireRole(roles = []) {
  return (req, res, next) => {
    const roleName = (req.user?.role_name || "").toLowerCase();
    if (!roles.map((r) => r.toLowerCase()).includes(roleName)) {
      const error = new Error("Forbidden");
      error.statusCode = 403;
      return next(error);
    }
    return next();
  };
}

module.exports = requireRole;

