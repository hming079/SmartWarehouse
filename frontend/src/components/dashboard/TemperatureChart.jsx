import React from "react";
import Card from "../ui/Card";
import { temperatureChartData } from "../../constants/mockData";

const TemperatureChart = ({ data, currentTemp = 30 }) => {
  const chartData = data && data.length > 0
    ? data.map(item => ({ height: Math.min(100, Math.max(10, (item.value / 50) * 100)) })) // Tỉ lệ theo max 50 độ
    : temperatureChartData;

  return (
    <Card className="flex flex-col bg-[#fcfafd] p-6 lg:p-10 border-none h-[300px]">
      <div className="flex flex-col mb-auto">
        <h3 className="text-xl font-medium text-black">Temperature</h3>
        <p className="mt-2 text-4xl font-bold text-gray-700">
          + {currentTemp} °C
        </p>
      </div>

      <div className="flex h-32 items-end justify-between gap-2 mt-8 px-2">
        {chartData.map((item, idx) => (
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
