const authService = require("../modules/auth/auth.service");

function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization || "";
    if (!authHeader.startsWith("Bearer ")) {
      const error = new Error("Unauthorized");
      error.statusCode = 401;
      throw error;
    }

    const token = authHeader.slice(7);
    const payload = authService.verifyToken(token);

    req.user = {
      user_id: payload.sub,
      username: payload.username,
      role_id: payload.role_id,
      role_name: payload.role_name || null,
      token,
    };

    return next();
  } catch (error) {
    error.statusCode = error.statusCode || 401;
    return next(error);
  }
}

module.exports = requireAuth;
