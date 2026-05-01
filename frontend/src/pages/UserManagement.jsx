import { useEffect, useState } from "react";
import { api } from "../api";

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ username: "", password: "", full_name: "", email: "", role_name: "staff" });
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadUsers = async () => {
    try {
      const res = await api.getUsers();
      setUsers(res.data || []);
    } catch (err) {
      setError(err.message || "Cannot load users");
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    try {
      await api.createUser(form);
      setMessage("User created");
      setForm({ username: "", password: "", full_name: "", email: "", role_name: "staff" });
      await loadUsers();
    } catch (err) {
      setError(err.message || "Create user failed");
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Create Account</h1>
      <form onSubmit={onSubmit} className="grid gap-3 max-w-xl">
        <input className="border rounded px-3 py-2" placeholder="Username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required />
        <input className="border rounded px-3 py-2" type="password" placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
        <input className="border rounded px-3 py-2" placeholder="Full name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
        <input className="border rounded px-3 py-2" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <select className="border rounded px-3 py-2" value={form.role_name} onChange={(e) => setForm({ ...form, role_name: e.target.value })}>
          <option value="staff">Staff</option>
          <option value="manager">Manager</option>
        </select>
        {error ? <p className="text-red-600 text-sm">{error}</p> : null}
        {message ? <p className="text-green-700 text-sm">{message}</p> : null}
        <button className="bg-blue-600 text-white px-4 py-2 rounded w-fit">Create user</button>
      </form>

      <div>
        <h2 className="text-lg font-medium mb-2">Users</h2>
        <ul className="space-y-1 text-sm">
          {users.map((u) => (
            <li key={u.user_id}>{u.username} - {u.role_name || u.role_id}</li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default UserManagement;

