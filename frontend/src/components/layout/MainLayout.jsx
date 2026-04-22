import { useSearchParams } from "react-router-dom";
import { useEffect } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import PageContainer from "./PageContainer";
import { summary } from "../../constants/mockData";

const LOCATION_KEY = "smartwarehouse.selected-location";

const MainLayout = ({ children }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const areaId = Number(searchParams.get("areaId")) || null;
  const floorId = Number(searchParams.get("floorId")) || null;
  const roomId = Number(searchParams.get("roomId")) || null;

  // Load from localStorage on first mount if URL params are empty
  useEffect(() => {
    // Only restore from localStorage if no location params are set in URL
    if (!areaId && !floorId && !roomId && typeof window !== "undefined") {
      try {
        const saved = JSON.parse(window.localStorage.getItem(LOCATION_KEY) || "{}");
        if (saved.areaId || saved.floorId || saved.roomId) {
          const params = {};
          if (saved.areaId) params.areaId = String(saved.areaId);
          if (saved.floorId) params.floorId = String(saved.floorId);
          if (saved.roomId) params.roomId = String(saved.roomId);
          setSearchParams(params);
        }
      } catch (_) {
        // Ignore localStorage errors
      }
    }
  }, []);

  // Save to localStorage whenever selection changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      const locationData = { areaId, floorId, roomId };
      window.localStorage.setItem(LOCATION_KEY, JSON.stringify(locationData));
    }
  }, [areaId, floorId, roomId]);

  const handleLocationChange = ({ areaId: newAreaId, floorId: newFloorId, roomId: newRoomId }) => {
    const params = {};
    if (newAreaId) params.areaId = String(newAreaId);
    if (newFloorId) params.floorId = String(newFloorId);
    if (newRoomId) params.roomId = String(newRoomId);
    setSearchParams(params);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#f5f6fa]">
      <Sidebar />
      <main className="min-h-0 flex-1 overflow-y-auto p-5 lg:p-6">
        {/* <Header
          location={summary.location}
          user={summary.user}
          areaId={areaId}
          floorId={floorId}
          roomId={roomId}
          onLocationChange={handleLocationChange}
        /> */}
        <PageContainer>{children}</PageContainer>
      </main>
    </div>
  );
};

export default MainLayout;

