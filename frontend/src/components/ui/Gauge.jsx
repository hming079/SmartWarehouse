const Gauge = ({ value = 30, min = 10, max = 30 }) => {
  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div className="relative flex h-56 w-full items-center justify-center">
      <div className="absolute top-12 h-40 w-72 rounded-t-full border-[14px] border-b-0 border-gray-300" />
      <div
        className="absolute top-12 h-40 w-72 rounded-t-full border-[14px] border-b-0 border-transparent"
        style={{
          borderImage: "linear-gradient(90deg, #7c3aed, #ec4899, #f97316) 1",
          clipPath: `inset(0 ${100 - percentage}% 0 0)`,
        }}
      />

      <div className="absolute top-20 flex h-32 w-40 flex-col items-center justify-center rounded-full bg-gray-100 shadow-lg">
        <p className="text-sm text-gray-500">Goal</p>
        <p className="text-4xl font-bold text-gray-900">{value} °C</p>
      </div>

      <p className="absolute left-16 top-28 text-sm font-semibold text-gray-500">10 °C</p>
      <p className="absolute right-16 top-28 text-sm font-semibold text-gray-500">30 °C</p>
      <p className="absolute top-5 text-xl font-bold text-[#7c3aed]">20 °C</p>
    </div>
  );
};

export default Gauge;

