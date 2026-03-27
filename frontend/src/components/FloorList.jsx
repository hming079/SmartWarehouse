import { useState } from "react";

const FloorList = ({ floors, selectedZone, selectedFloorId, onSelect, onAdd, onDelete }) => {
  const [floorNumber, setFloorNumber] = useState("");
  const disabled = !selectedZone;

  const handleAdd = async () => {
    if (disabled || floorNumber === "") return;
    await onAdd(Number(floorNumber));
    setFloorNumber("");
  };

  return (
    <div className="rounded-2xl bg-white p-4 shadow">
      <h2 className="mb-3 text-lg font-bold text-[#24124d]">Floor</h2>

      <div className="mb-3 flex gap-2">
        <input
          type="number"
          value={floorNumber}
          disabled={disabled}
          onChange={(e) => setFloorNumber(e.target.value)}
          placeholder="Số tầng"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-purple-500 disabled:bg-gray-100"
        />
        <button
          onClick={handleAdd}
          disabled={disabled}
          className="rounded-lg bg-purple-600 px-3 py-2 text-sm font-semibold text-white hover:bg-purple-700 disabled:cursor-not-allowed disabled:bg-gray-400"
        >
          Add
        </button>
      </div>

      <div className="space-y-2">
        {floors.map((floor) => (
          <div
            key={floor.floor_id}
            className={`flex items-center justify-between rounded-lg px-3 py-2 ${
              selectedFloorId === floor.floor_id ? "bg-purple-100" : "bg-gray-50"
            }`}
          >
            <button onClick={() => onSelect(floor)} className="text-left text-sm font-medium text-gray-800">
              Floor {floor.floor_number}
            </button>
            <button onClick={() => onDelete(floor.floor_id)} className="text-xs text-red-500 hover:text-red-700">
              Delete
            </button>
          </div>
        ))}

        {selectedZone && floors.length === 0 && <p className="text-sm text-gray-500">Chưa có floor</p>}
        {!selectedZone && <p className="text-sm text-gray-500">Chọn Zone để xem Floor</p>}
      </div>
    </div>
  );
};

export default FloorList;

