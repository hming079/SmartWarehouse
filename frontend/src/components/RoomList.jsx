import { useState } from "react";

const RoomList = ({ rooms, selectedFloor, foodTypes = [], onAdd, onDelete, onSelect }) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [foodTypeId, setFoodTypeId] = useState("");
  const disabled = !selectedFloor;

  const resolvedFoodTypeId =
    foodTypeId
    || (foodTypes[0]?.type_id !== undefined && foodTypes[0]?.type_id !== null
      ? String(foodTypes[0].type_id)
      : "");

  const handleAdd = async () => {
    const roomName = name.trim();
    const parsedFoodTypeId = Number(resolvedFoodTypeId);
    if (disabled || !roomName || !Number.isInteger(parsedFoodTypeId) || parsedFoodTypeId <= 0) return;
    await onAdd({
      name: roomName,
      description: description.trim(),
      food_type_id: parsedFoodTypeId,
    });
    setName("");
    setDescription("");
    setFoodTypeId("");
  };

  return (
    <div className="rounded-2xl bg-white p-4 shadow">
      <h2 className="mb-3 text-lg font-bold text-[#24124d]">Room</h2>

      <div className="mb-3 space-y-2">
        <input
          value={name}
          disabled={disabled}
          onChange={(e) => setName(e.target.value)}
          placeholder="Tên phòng"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-purple-500 disabled:bg-gray-100"
        />
        <input
          value={description}
          disabled={disabled}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Mô tả"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-purple-500 disabled:bg-gray-100"
        />
        <select
          value={resolvedFoodTypeId}
          disabled={disabled || foodTypes.length === 0}
          onChange={(e) => setFoodTypeId(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-purple-500 disabled:bg-gray-100"
        >
          {foodTypes.length === 0 ? (
            <option value="">Chưa có loại thực phẩm</option>
          ) : (
            foodTypes.map((item) => (
              <option key={item.type_id} value={item.type_id}>{item.name}</option>
            ))
          )}
        </select>
        <button
          onClick={handleAdd}
          disabled={disabled || foodTypes.length === 0}
          className="w-full rounded-lg bg-purple-600 px-3 py-2 text-sm font-semibold text-white hover:bg-purple-700 disabled:cursor-not-allowed disabled:bg-gray-400"
        >
          Add
        </button>
      </div>

      <div className="space-y-2">
        {rooms.map((room) => (
          <div
            key={room.room_id}
            className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 transition hover:bg-purple-50"
          >
            <button onClick={() => onSelect?.(room)} className="flex-1 text-left">
              <p className="text-sm font-medium text-gray-800">{room.name}</p>
              {room.food_type_name ? <p className="text-xs text-indigo-600">{room.food_type_name}</p> : null}
              {room.description ? <p className="text-xs text-gray-500">{room.description}</p> : null}
            </button>
            <button
              onClick={() => onDelete(room.room_id)}
              className="ml-3 text-xs text-red-500 hover:text-red-700"
            >
              Delete
            </button>
          </div>
        ))}

        {selectedFloor && rooms.length === 0 && <p className="text-sm text-gray-500">Chưa có room</p>}
        {!selectedFloor && <p className="text-sm text-gray-500">Chọn Floor để xem Room</p>}
      </div>
    </div>
  );
};

export default RoomList;

