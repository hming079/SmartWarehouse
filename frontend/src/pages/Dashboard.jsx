import React from "react";
import PowerChart from "../components/dashboard/PowerChart";
import TemperatureChart from "../components/dashboard/TemperatureChart";

const Dashboard = () => {
  return (
    <section className="flex flex-col gap-8 max-w-5xl">
      <PowerChart />
      <TemperatureChart />
    </section>
  );
};

export default Dashboard;

