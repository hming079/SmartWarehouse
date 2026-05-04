import React from "react";
import PowerChart from "../components/dashboard/PowerChart";
import TemperatureChart from "../components/dashboard/TemperatureChart";
import { useDashboardData } from "../hooks/dashboardHook";

const Dashboard = () => {
  const { overview, temperatureTimeseries, powerTimeseries, loading, error } = useDashboardData();

  if (loading) {
    return <div className="p-8">Đang tải dữ liệu Dashboard...</div>;
  }

  if (error) {
    return <div className="p-8 text-red-500">Lỗi: {error}</div>;
  }

  return (
    <section className="flex flex-col gap-8 max-w-5xl">
      <PowerChart data={powerTimeseries} />
      <TemperatureChart data={temperatureTimeseries} currentTemp={overview?.latest?.temperature} />
    </section>
  );
};

export default Dashboard;

