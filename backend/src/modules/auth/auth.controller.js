const authService = require("./auth.service");

async function login(req, res, next) {
  try {
    const data = await authService.login(req.body || {});
    res.json({ ok: true, data });
  } catch (error) {
    next(error);
  }
}

async function logout(req, res, next) {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    authService.logout(token);
    res.json({ ok: true, message: "Logged out successfully" });
  } catch (error) {
    next(error);
  }
}

async function me(req, res) {
  res.json({ ok: true, data: req.user });
}

module.exports = {
  login,
  logout,
  me,
};
