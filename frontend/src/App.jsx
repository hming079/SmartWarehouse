import { BrowserRouter, Link, Navigate, Route, Routes } from "react-router-dom";
import MainLayout from "./components/layout/MainLayout";
import Devices from "./pages/Devices";
import Automation from "./pages/Automation";
import Dashboard from "./pages/Dashboard";
import Schedules from "./pages/Schedules";

import AreaManagement from "./pages/AreaManagement";
import RoomDetail from "./pages/RoomDetail";
import AuditLogs from "./pages/AuditLogs";
import Home from "./pages/Home";
import Login from "./pages/Login";
import UserManagement from "./pages/UserManagement";

const UnauthenticatedNotice = () => (
  <div className="flex min-h-screen items-center justify-center bg-[#f5f3fb] px-4">
    <div className="w-full max-w-md rounded-2xl bg-white p-6 text-center shadow-lg">
      <h2 className="text-2xl font-bold text-[#24124d]">Bạn chưa đăng nhập</h2>
      <p className="mt-2 text-sm text-gray-600">Vui lòng đăng nhập để truy cập các trang trong hệ thống.</p>
      <Link to="/login" className="mt-5 inline-block rounded-xl bg-gradient-to-r from-[#7c3aed] to-[#a855f7] px-4 py-2 text-sm font-semibold text-white hover:brightness-110">
        Đi đến trang đăng nhập
      </Link>
    </div>
  </div>
);

const hasValidToken = () => {
  const token = localStorage.getItem("auth_token");
  return Boolean(token && token !== "null" && token !== "undefined");
};

const PrivateRoute = ({ children }) => {
  return hasValidToken() ? children : <UnauthenticatedNotice />;
};

const App = () => {
  const token = hasValidToken();

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={token ? <Navigate to="/home" replace /> : <Login />} />

        <Route
          path="/"
          element={<Navigate to="/login" replace />}
        />

        <Route path="/home" element={<PrivateRoute><MainLayout><Home /></MainLayout></PrivateRoute>} />
        <Route path="/area" element={<PrivateRoute><MainLayout><AreaManagement /></MainLayout></PrivateRoute>} />
        <Route path="/rooms/:roomId" element={<PrivateRoute><MainLayout><RoomDetail /></MainLayout></PrivateRoute>} />
        <Route path="/dashboard" element={<PrivateRoute><MainLayout><Dashboard /></MainLayout></PrivateRoute>} />
        <Route path="/devices/:view?" element={<PrivateRoute><MainLayout><Devices /></MainLayout></PrivateRoute>} />
        <Route path="/automation" element={<PrivateRoute><MainLayout><Automation /></MainLayout></PrivateRoute>} />
        <Route path="/schedules" element={<PrivateRoute><MainLayout><Schedules /></MainLayout></PrivateRoute>} />
        <Route path="/users" element={<PrivateRoute><MainLayout><UserManagement /></MainLayout></PrivateRoute>} />
        <Route path="/audit-logs" element={<PrivateRoute><MainLayout><AuditLogs /></MainLayout></PrivateRoute>} />

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;

