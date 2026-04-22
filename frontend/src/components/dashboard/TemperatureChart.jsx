import React from "react";
import Card from "../ui/Card";
import { temperatureChartData } from "../../constants/mockData";

const TemperatureChart = ({ currentTemp = 30 }) => {
  return (
    <Card className="flex flex-col bg-[#fcfafd] p-6 lg:p-10 border-none h-[300px]">
      <div className="flex flex-col mb-auto">
        <h3 className="text-xl font-medium text-black">Temperature</h3>
        <p className="mt-2 text-4xl font-bold text-gray-700">
          + {currentTemp} °C
        </p>
      </div>

      <div className="flex h-32 items-end justify-between gap-2 mt-8 px-2">
        {temperatureChartData.map((item, idx) => (
          <div
            key={idx}
            className="w-12 rounded-t-full bg-[#cbcaca]"
            style={{ height: `${item.height}%` }}
          />
        ))}
      </div>
    </Card>
  );
};

export default TemperatureChart;
