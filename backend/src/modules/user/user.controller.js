const userService = require("./user.service");

function listUsers(req, res) {
  const users = userService.getAllUsers();
  res.json({ ok: true, data: users });
}

module.exports = {
  listUsers,
};
