import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import MainLayout from "./components/layout/MainLayout";
import Devices from "./pages/Devices";
import Automation from "./pages/Automation";
import Dashboard from "./pages/Dashboard";
import Placeholder from "./pages/Placeholder";
import AreaManagement from "./pages/AreaManagement";

const App = () => {
  return (
    <BrowserRouter>
      <MainLayout>
        <Routes>
          <Route path="/" element={<Navigate to="/area" replace />} />
          <Route path="/area" element={<AreaManagement />} />
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

