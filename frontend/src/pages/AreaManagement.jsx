import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import ZoneList from "../components/ZoneList";
import FloorList from "../components/FloorList";
import RoomList from "../components/RoomList";
import { api } from "../api";

const LOCATION_ID = 1;

const AreaManagement = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [zones, setZones] = useState([]);
  const [floors, setFloors] = useState([]);
  const [rooms, setRooms] = useState([]);

  const [selectedZone, setSelectedZone] = useState(null);
  const [selectedFloor, setSelectedFloor] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadZones = async () => {
    const res = await api.getZones(LOCATION_ID);
    setZones(res.data || []);
  };

  const loadFloors = async (zoneId) => {
    const res = await api.getFloors(zoneId);
    setFloors(res.data || []);
  };

  const loadRooms = async (floorId) => {
    const res = await api.getRooms(floorId);
    setRooms(res.data || []);
  };

  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        setError("");
        await loadZones();
      } catch (err) {
        setError(err.message || "Không thể tải zones");
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  const handleSelectZone = async (zone) => {
    try {
      setSelectedZone(zone);
      setSelectedFloor(null);
      setRooms([]);
      await loadFloors(zone.zone_id);
    } catch (err) {
      setError(err.message || "Không thể tải floors");
    }
  };

  const handleSelectFloor = async (floor) => {
    try {
      setSelectedFloor(floor);
      await loadRooms(floor.floor_id);
    } catch (err) {
      setError(err.message || "Không thể tải rooms");
    }
  };

  const handleAddZone = async (name) => {
    try {
      await api.createZone({ location_id: LOCATION_ID, name });
      await loadZones();
    } catch (err) {
      setError(err.message || "Không thể thêm zone");
    }
  };

  const handleDeleteZone = async (zoneId) => {
    try {
      await api.deleteZone(zoneId);
      await loadZones();
      if (selectedZone?.zone_id === zoneId) {
        setSelectedZone(null);
        setSelectedFloor(null);
        setFloors([]);
        setRooms([]);
      }
    } catch (err) {
      setError(err.message || "Không thể xóa zone");
    }
  };

  const handleAddFloor = async (floorNumber) => {
    if (!selectedZone) return;
    try {
      await api.createFloor({ zone_id: selectedZone.zone_id, floor_number: floorNumber });
      await loadFloors(selectedZone.zone_id);
    } catch (err) {
      setError(err.message || "Không thể thêm floor");
    }
  };

  const handleDeleteFloor = async (floorId) => {
    if (!selectedZone) return;
    try {
      await api.deleteFloor(floorId);
      await loadFloors(selectedZone.zone_id);
      if (selectedFloor?.floor_id === floorId) {
        setSelectedFloor(null);
        setRooms([]);
      }
    } catch (err) {
      setError(err.message || "Không thể xóa floor");
    }
  };

  const handleAddRoom = async ({ name, description }) => {
    if (!selectedFloor) return;
    try {
      await api.createRoom({ floor_id: selectedFloor.floor_id, name, description });
      await loadRooms(selectedFloor.floor_id);
    } catch (err) {
      setError(err.message || "Không thể thêm room");
    }
  };

  const handleDeleteRoom = async (roomId) => {
    if (!selectedFloor) return;
    try {
      await api.deleteRoom(roomId);
      await loadRooms(selectedFloor.floor_id);
    } catch (err) {
      setError(err.message || "Không thể xóa room");
    }
  };

  const handleOpenRoomDetail = (room) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("roomId", String(room.room_id));

    if (selectedZone?.zone_id) {
      nextParams.set("areaId", String(selectedZone.zone_id));
    }

    if (selectedFloor?.floor_id) {
      nextParams.set("floorId", String(selectedFloor.floor_id));
    }

    navigate(
      {
        pathname: `/rooms/${room.room_id}`,
        search: `?${nextParams.toString()}`,
      },
      {
        state: {
          room,
          floor: selectedFloor,
          zone: selectedZone,
        },
      },
    );
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-[#24124d]">Select Room to check</h1>
      {loading && <p className="text-sm text-gray-500">Đang tải dữ liệu...</p>}
      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <ZoneList
          zones={zones}
          selectedZoneId={selectedZone?.zone_id}
          onSelect={handleSelectZone}
          onAdd={handleAddZone}
          onDelete={handleDeleteZone}
        />

        <FloorList
          floors={floors}
          selectedZone={selectedZone}
          selectedFloorId={selectedFloor?.floor_id}
          onSelect={handleSelectFloor}
          onAdd={handleAddFloor}
          onDelete={handleDeleteFloor}
        />

        <RoomList
          rooms={rooms}
          selectedFloor={selectedFloor}
          onAdd={handleAddRoom}
          onDelete={handleDeleteRoom}
          onSelect={handleOpenRoomDetail}
        />
      </div>
    </div>
  );
};

export default AreaManagement;

