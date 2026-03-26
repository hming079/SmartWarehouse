const sampleUsers = [
  {
    user_id: 1,
    username: "admin",
    full_name: "System Admin",
    email: "admin@example.com",
  },
];

function getAllUsers() {
  return sampleUsers;
}

module.exports = {
  getAllUsers,
};
