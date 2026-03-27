import Card from "../ui/Card";

const HumidityWidget = ({ humidity }) => {
  return (
    <Card className="bg-[#ece6f8] p-3 text-center text-gray-700">
      <p className="text-xl font-medium">Humidity</p>
      <p className="mb-2 text-3xl font-bold">{humidity} %</p>
      <div className="relative mt-2 h-20 overflow-hidden rounded-xl bg-[#dfd9ef]">
        <div className="absolute inset-x-0 bottom-0 h-14 rounded-t-[40px] bg-[#9cc3dc]" />
        <div className="absolute inset-x-6 bottom-0 h-9 rounded-t-[35px] bg-[#dfd9ef]" />
      </div>
    </Card>
  );
};

export default HumidityWidget;

