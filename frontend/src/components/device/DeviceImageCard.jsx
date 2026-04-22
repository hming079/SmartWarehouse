import React from "react";
import Card from "../ui/Card";

const DeviceImageCard = ({ device, onEdit, onDelete }) => {
  // Use a placeholder image or a mapped image
  const imageUrl = device.image || "https://placehold.co/400x300/e2e8f0/1e293b?text=" + encodeURIComponent(device.name);

  return (
    <Card className="flex flex-col overflow-hidden bg-white border border-[#e8def8]">
      <div className="h-48 w-full p-4 flex items-center justify-center bg-white">
        <img
          src={imageUrl}
          alt={device.name}
          className="max-h-full max-w-full object-contain"
        />
      </div>
      <div className="flex flex-1 flex-col justify-between bg-[#f4effa] p-5">
        <div>
          <h3 className="text-lg font-bold text-black">{device.name}</h3>
          <p className="text-sm text-gray-500">{device.id}</p>
        </div>
        <div className="mt-6 flex items-center gap-4">
          <button
            onClick={onEdit}
            className="flex-1 rounded-md border border-[#3b82f6] px-4 py-2 text-sm font-bold text-[#3b82f6] transition hover:bg-blue-50"
          >
            Edit
          </button>
          <button
            onClick={onDelete}
            className="flex-1 rounded-md border border-[#ef4444] px-4 py-2 text-sm font-bold text-[#ef4444] transition hover:bg-red-50"
          >
            Delete
          </button>
        </div>
      </div>
    </Card>
  );
};

export default DeviceImageCard;
