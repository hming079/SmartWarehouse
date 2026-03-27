import { useState } from "react";

const ZoneList = ({ zones, selectedZoneId, onSelect, onAdd, onDelete }) => {
  const [name, setName] = useState("");

  const handleAdd = async () => {
    const value = name.trim();
    if (!value) return;
    await onAdd(value);
    setName("");
  };

  return (
    <div className="rounded-2xl bg-white p-4 shadow">
      <h2 className="mb-3 text-lg font-bold text-[#24124d]">Area (Zone)</h2>

      <div className="mb-3 flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Tên Zone"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-purple-500"
        />
        <button onClick={handleAdd} className="rounded-lg bg-purple-600 px-3 py-2 text-sm font-semibold text-white hover:bg-purple-700">
          Add
        </button>
      </div>

      <div className="space-y-2">
        {zones.map((zone) => (
          <div
            key={zone.zone_id}
            className={`flex items-center justify-between rounded-lg px-3 py-2 ${
              selectedZoneId === zone.zone_id ? "bg-purple-100" : "bg-gray-50"
            }`}
          >
            <button onClick={() => onSelect(zone)} className="text-left text-sm font-medium text-gray-800">
              {zone.name}
            </button>
            <button onClick={() => onDelete(zone.zone_id)} className="text-xs text-red-500 hover:text-red-700">
              Delete
            </button>
          </div>
        ))}

        {zones.length === 0 && <p className="text-sm text-gray-500">Chưa có zone</p>}
      </div>
    </div>
  );
};

export default ZoneList;

