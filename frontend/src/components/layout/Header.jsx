import { useState, useEffect } from "react";

const API_PORT = process.env.REACT_APP_API_PORT || "5001";
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || `http://localhost:${API_PORT}`;

const Header = ({ location, user, areaId, floorId, roomId, onLocationChange }) => {
  const [areas, setAreas] = useState([]);
  const [floors, setFloors] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch all areas (zones)
  useEffect(() => {
    const loadAreas = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/zones`);
        if (res.ok) {
          const data = await res.json();
          setAreas(Array.isArray(data) ? data : data.data || []);
        }
      } catch (_) {
        // Silently fail
      }
    };
    loadAreas();
  }, []);

  // Fetch floors when area changes
  useEffect(() => {
    if (!areaId) {
      setFloors([]);
      setRooms([]);
      return;
    }

    const loadFloors = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/floors?zoneId=${areaId}`);
        if (res.ok) {
          const data = await res.json();
          setFloors(Array.isArray(data) ? data : data.data || []);
        }
      } catch (_) {
        setFloors([]);
      }
    };
    loadFloors();
  }, [areaId]);

  // Fetch rooms when floor changes
  useEffect(() => {
    if (!floorId) {
      setRooms([]);
      return;
    }

    const loadRooms = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/rooms?floorId=${floorId}`);
        if (res.ok) {
          const data = await res.json();
          setRooms(Array.isArray(data) ? data : data.data || []);
        }
      } catch (_) {
        setRooms([]);
      }
    };
    loadRooms();
  }, [floorId]);

  const handleAreaChange = (e) => {
    const newAreaId = Number(e.target.value) || null;
    if (onLocationChange) {
      onLocationChange({ areaId: newAreaId, floorId: null, roomId: null });
    }
  };

  const handleFloorChange = (e) => {
    const newFloorId = Number(e.target.value) || null;
    if (onLocationChange) {
      onLocationChange({ areaId, floorId: newFloorId, roomId: null });
    }
  };

  const handleRoomChange = (e) => {
    const newRoomId = Number(e.target.value) || null;
    if (onLocationChange) {
      onLocationChange({ areaId, floorId, roomId: newRoomId });
    }
  };

  return (
    <header className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      {/* <div className="flex flex-1 items-center gap-3 rounded-full bg-gray-200 px-5 py-3 text-gray-500">
        <span className="text-xl">⌕</span>
        <input
          type="text"
          placeholder="Search using keywords or name ..."
          className="w-full bg-transparent text-sm outline-none placeholder:text-gray-500"
        />
      </div> */}

      <div className="flex ml-auto items-center gap-4">
        {/* <div className="h-12 w-12 rounded-full bg-gradient-to-br from-yellow-300 to-pink-500" /> */}
        <div>
          {/* <p className="font-semibold text-gray-800">{user}</p> */}
          <div className="text-sm font-bold leading-tight text-gray-900 space-y-0.5">
            <div>
              {/* <label htmlFor="area-select" className="block text-xs">
                Khu vực:
              </label> */}
              <select
                id="area-select"
                value={areaId || ""}
                onChange={handleAreaChange}
                className="mt-1 w-full rounded bg-white px-2 py-0.5 text-xs text-gray-800 border border-gray-300"
              >
                <option value="">-- Chọn khu vực --</option>
                {areas.map((area) => (
                  <option key={area.zone_id} value={area.zone_id}>
                    {area.name || `Area ${area.zone_id}`}
                  </option>
                ))}
              </select>
            </div>

            {areaId && (
              <div>
                {/* <label htmlFor="floor-select" className="block text-xs">
                  Tầng:
                </label> */}
                <select
                  id="floor-select"
                  value={floorId || ""}
                  onChange={handleFloorChange}
                  className="mt-1 w-full rounded bg-white px-2 py-0.5 text-xs text-gray-800 border border-gray-300"
                >
                  <option value="">-- Chọn tầng --</option>
                  {floors.map((floor) => (
                    <option key={floor.floor_id} value={floor.floor_id}>
                      {floor.floor_number ? `Floor ${floor.floor_number}` : floor.floor_name || `Floor ${floor.floor_id}`}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {floorId && (
              <div>
                {/* <label htmlFor="room-select" className="block text-xs">
                  Phòng:
                </label> */}
                <select
                  id="room-select"
                  value={roomId || ""}
                  onChange={handleRoomChange}
                  className="mt-1 w-full rounded bg-white px-2 py-0.5 text-xs text-gray-800 border border-gray-300"
                >
                  <option value="">-- Chọn phòng --</option>
                  {rooms.map((room) => (
                    <option key={room.room_id} value={room.room_id}>
                      {room.name || `Room ${room.room_id}`}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
        <span className="text-xl text-gray-600">⋮</span>
      </div>
    </header>
  );
};

export default Header;

