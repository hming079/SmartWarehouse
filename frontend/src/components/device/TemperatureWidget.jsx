import Card from "../ui/Card";

const TemperatureWidget = ({ temperature }) => {
  return (
    <Card className="bg-[#ece6f8] p-3 text-center text-gray-700">
      <p className="mb-4 text-xl font-medium">Temperature</p>
      <p className="mb-5 text-3xl font-bold">+ {temperature} °C</p>
      <div className="flex h-20 items-end justify-center gap-3">
        {[55, 35, 75, 50].map((h, idx) => (
          <div key={idx} className="w-6 rounded-t-full bg-gray-400/80" style={{ height: `${h}%` }} />
        ))}
      </div>
    </Card>
  );
};

export default TemperatureWidget;

