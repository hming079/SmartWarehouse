import React from "react";
import Card from "../ui/Card";
import Toggle from "../ui/Toggle";

const OverviewACWidget = ({ temperature, isOn, onToggle }) => {
  const radius = 100;
  const strokeWidth = 28; // Thicker stroke to match image
  const circumference = Math.PI * radius;
  const percentage = 0.65; // Active track percentage
  const dashoffset = circumference - percentage * circumference;

  const angle = Math.PI * (1 - percentage);
  const knobX = 130 + 100 * Math.cos(angle);
  const knobY = 130 - 100 * Math.sin(angle);

  return (
    <Card className="bg-[#f5effb] p-6 lg:p-8">
      <div className="mb-10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#e3d5ff] text-2xl text-[#6b58db]">
            ❄
          </div>
          <h2 className="text-xl font-bold text-[#1a1150]">Air Conditioner</h2>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-2xl font-bold text-[#1a1150]">
            {isOn ? "ON" : "OFF"}
          </span>
          <Toggle 
            checked={isOn} 
            onChange={onToggle} 
            activeTrackColor="bg-[#5ce15c]" // Exact green from image
            activeKnobColor="bg-white"
            inactiveTrackColor="bg-gray-300"
            inactiveKnobColor="bg-white"
          />
        </div>
      </div>

      {/* Added pb-20 to accommodate the overlapping bottom circle */}
      <div className="relative mx-auto flex max-w-[500px] items-end justify-between pt-8 pb-20">
        {/* Left Side Control */}
        <div className="flex items-center gap-4 mb-4">
          <button className="flex h-14 w-12 items-center justify-center rounded-2xl bg-[#e3d5ff] text-2xl font-bold text-black shadow-sm transition hover:bg-[#d0bfff]">
            -
          </button>
          <div className="flex flex-col items-center leading-tight">
            <span className="text-base font-bold text-[#6b7280]">10</span>
            <span className="text-base font-bold text-[#6b7280]">°C</span>
          </div>
          <div className="h-[2px] w-6 bg-gray-400"></div>
        </div>

        {/* SVG Gauge Container */}
        <div className="relative flex flex-col items-center">
          <svg className="h-[130px] w-[260px] overflow-visible" viewBox="0 0 260 130">
            <defs>
              <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#a855f7" />
                <stop offset="100%" stopColor="#f97316" />
              </linearGradient>
            </defs>

            {/* Background Track */}
            <path
              d="M 30 130 A 100 100 0 0 1 230 130"
              fill="none"
              stroke="#e5e7eb"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
            />

            {/* Active Track */}
            <path
              d="M 30 130 A 100 100 0 0 1 230 130"
              fill="none"
              stroke="url(#gaugeGradient)"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashoffset}
              className="transition-all duration-500 ease-in-out"
            />
            
            {/* Start point white dot */}
            <circle cx="30" cy="130" r="3" fill="white" />
            
            {/* Label for End of Active Track */}
            <text
              x={knobX + 5}
              y={knobY - 15}
              fill="#a855f7"
              fontSize="16"
              fontWeight="bold"
            >
              20 °C
            </text>
          </svg>

          {/* Center Goal Overlay (Large White Circle) */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 flex h-36 w-36 flex-col items-center justify-center rounded-full bg-white shadow-[0_10px_30px_rgba(0,0,0,0.1)]">
            <span className="text-[15px] font-medium text-[#6b58db]">Goal</span>
            <span className="text-[40px] font-bold text-black leading-none mt-1">
              {temperature} <span className="text-3xl font-medium">°C</span>
            </span>
          </div>
        </div>

        {/* Right Side Control */}
        <div className="flex items-center gap-4 mb-4">
          <div className="h-[2px] w-6 bg-gray-400"></div>
          <div className="flex flex-col items-center leading-tight">
            <span className="text-base font-bold text-[#6b7280]">30</span>
            <span className="text-base font-bold text-[#6b7280]">°C</span>
          </div>
          <button className="flex h-14 w-12 items-center justify-center rounded-2xl bg-[#e3d5ff] text-2xl font-bold text-black shadow-sm transition hover:bg-[#d0bfff]">
            +
          </button>
        </div>
      </div>
    </Card>
  );
};

export default OverviewACWidget;
