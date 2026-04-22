export const tabs = ["Tổng quan", "Danh sách", "Thẻ"];

export const devices = [
  { id: 1, name: "Temperature", status: "on", type: "temperature", active: true },
  { id: 2, name: "Lights", status: "off", type: "lights", active: false },
  { id: 3, name: "Air Conditioner", status: "off", type: "ac", active: false },
  { id: 4, name: "Refrigerator", status: "off", type: "fridge", active: false },
];

export const summary = {
  location: "Khu vực 1 > Tầng 1 > Phòng 1",
  user: "Jasica Williamson",
  temperature: 30,
  humidity: 30,
  activeDevices: 3,
  totalDevices: 5,
};

// Mock data for Power Consumed Chart
export const powerChartData = [
  { name: "Text", line1: 22, line2: 5 },
  { name: "Text", line1: 3, line2: 10 },
  { name: "Text", line1: 68, line2: 27 },
  { name: "Text", line1: 52, line2: 66 },
  { name: "Text", line1: 0, line2: 0 },
];

// Mock data for Temperature Bar Chart
export const temperatureChartData = [
  { height: 45 },
  { height: 35 },
  { height: 60 },
  { height: 40 },
  { height: 45 },
  { height: 35 },
  { height: 65 },
  { height: 35 },
  { height: 40 },
  { height: 30 },
  { height: 60 },
  { height: 40 },
  { height: 45 },
  { height: 35 },
];

