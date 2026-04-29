import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import MainLayout from "./components/layout/MainLayout";
import Devices from "./pages/Devices";
import Automation from "./pages/Automation";
import Dashboard from "./pages/Dashboard";
import Schedules from "./pages/Schedules";
import Placeholder from "./pages/Placeholder";
import AreaManagement from "./pages/AreaManagement";
import RoomDetail from "./pages/RoomDetail";
import AuditLogs from "./pages/AuditLogs";
import Home from "./pages/Home"

const App = () => {
  return (
    <BrowserRouter>
      <MainLayout>
        <Routes>
          <Route path="/" element={<Navigate to="/home" replace />} />
          <Route path="/home" element={<Home/>}/>
          <Route path="/area" element={<AreaManagement />} />
          <Route path="/rooms/:roomId" element={<RoomDetail />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/devices/:view?" element={<Devices />} />
          <Route path="/automation" element={<Automation />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="*" element={<Placeholder />} />
        </Routes>
      </MainLayout>
    </BrowserRouter>
  );
};

export default App;

