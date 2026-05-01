const userService = require("./user.service");

async function listUsers(req, res, next) {
  try {
    const users = await userService.getUsers();
    res.json({ ok: true, data: users });
  } catch (error) {
    next(error);
  }
}

async function createUser(req, res, next) {
  try {
    const { username, password, full_name, email, role_name } = req.body || {};
    if (!username || !password) {
      const error = new Error("username and password are required");
      error.statusCode = 400;
      throw error;
    }

    await userService.createUser({ username, password, full_name, email, role_name });
    res.status(201).json({ ok: true, message: "User created" });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listUsers,
  createUser,
};
