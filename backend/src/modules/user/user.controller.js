const userService = require("./user.service");

async function listUsers(req, res, next) {
  try {
    const users = await userService.getUsers();
    res.json({ ok: true, data: users });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listUsers,
};
