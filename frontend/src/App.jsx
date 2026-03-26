import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import MainLayout from "./components/layout/MainLayout";
import Devices from "./pages/Devices";
import Automation from "./pages/Automation";
import Placeholder from "./pages/Placeholder";

const App = () => {
  return (
    <BrowserRouter>
      <MainLayout>
        <Routes>
          <Route path="/" element={<Navigate to="/devices" replace />} />
          <Route path="/devices" element={<Devices />} />
          <Route path="/automation" element={<Automation />} />
          <Route path="*" element={<Placeholder />} />
        </Routes>
      </MainLayout>
    </BrowserRouter>
  );
};

export default App;

