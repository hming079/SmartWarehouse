import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import Card from "../ui/Card";
import { powerChartData } from "../../constants/mockData";

const PowerChart = ({ data }) => {
  const chartData = data && data.length > 0
    ? data.map(item => ({
        name: new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        line1: item.value,
        line2: item.value * 0.8
      }))
    : powerChartData;

  return (
    <Card className="flex flex-col overflow-hidden bg-[#fcfafd] p-6 lg:p-8 border-none h-[400px]">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#ebdcf9] text-[#6b58db] shadow-sm">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-black">Power Consumed</h2>
        </div>
        <span className="text-sm font-medium text-gray-500">This Week</span>
      </div>

      <div className="flex-1 min-h-0 relative -ml-4 -mr-4">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={true} horizontal={true} stroke="#f0f0f0" />
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#9ca3af", fontSize: 12 }}
              dy={10}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#9ca3af", fontSize: 12 }}
              ticks={[0, 20, 40, 60, 80]}
              domain={[0, 80]}
            />
            {/* The light blue line */}
            <Line
              type="monotone"
              dataKey="line2"
              stroke="#add8e6"
              strokeWidth={2}
              dot={{ fill: "#add8e6", strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6 }}
            />
            {/* The dark blue line */}
            <Line
              type="monotone"
              dataKey="line1"
              stroke="#0a64a3"
              strokeWidth={2}
              dot={{ fill: "#0a64a3", strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};

export default PowerChart;
