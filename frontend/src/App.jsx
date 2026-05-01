import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
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

const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem("auth_token");
  return token ? children : <Navigate to="/login" replace />;
};

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route
          path="/"
          element={
            <PrivateRoute>
              <MainLayout>
                <Home />
              </MainLayout>
            </PrivateRoute>
          }
        />

        <Route
          path="/home"
          element={
            <PrivateRoute>
              <MainLayout>
                <Home />
              </MainLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/area"
          element={
            <PrivateRoute>
              <MainLayout>
                <AreaManagement />
              </MainLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/rooms/:roomId"
          element={
            <PrivateRoute>
              <MainLayout>
                <RoomDetail />
              </MainLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <MainLayout>
                <Dashboard />
              </MainLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/devices/:view?"
          element={
            <PrivateRoute>
              <MainLayout>
                <Devices />
              </MainLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/automation"
          element={
            <PrivateRoute>
              <MainLayout>
                <Automation />
              </MainLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/schedules"
          element={
            <PrivateRoute>
              <MainLayout>
                <Schedules />
              </MainLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/users"
          element={
            <PrivateRoute>
              <MainLayout>
                <UserManagement />
              </MainLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/audit-logs"
          element={
            <PrivateRoute>
              <MainLayout>
                <AuditLogs />
              </MainLayout>
            </PrivateRoute>
          }
        />

        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;

