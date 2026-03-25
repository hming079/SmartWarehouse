import { useEffect, useMemo, useState } from "react";
import tempImg from "../assets/stats/tmp.png";
import humidityImg from "../assets/stats/hum.png";
import Sidebar from "./Sidebar";
import {
  Avatar,
  Badge,
  Box,
  Card,
  Flex,
  Heading,
  IconButton,
  Separator,
  Switch,
  Tabs,
  Text,
  TextField
} from "@radix-ui/themes";

const DEVICE_CARDS = [
  { key: "temperature", title: "Temperature", state: "on" },
  { key: "lights", title: "Lights", state: "off" },
  { key: "air", title: "Air Conditioner", state: "off" },
  { key: "fridge", title: "Refrigerator", state: "off" }
];

export default function Detail() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [payload, setPayload] = useState(null);

  useEffect(() => {
    let alive = true;

    async function loadData() {
      try {
        setLoading(true);
        setError("");

        const res = await fetch("http://localhost:5000/data");
        if (!res.ok) {
          throw new Error("Request failed with status " + res.status);
        }

        const json = await res.json();
        if (alive) setPayload(json);
      } catch (err) {
        if (alive) setError(err.message || "Failed to fetch data");
      } finally {
        if (alive) setLoading(false);
      }
    }

    loadData();
    const timer = setInterval(loadData, 100000);

    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, []);

  const temp = Number(payload?.data?.temperature?.[0]?.value ?? 30);
  const hum = Number(payload?.data?.humidity?.[0]?.value ?? 30);
  const ts = payload?.data?.temperature?.[0]?.ts || payload?.data?.humidity?.[0]?.ts;

  const gaugeDeg = useMemo(() => {
    const clamped = Math.max(0, Math.min(temp, 40));
    return (clamped / 40) * 260;
  }, [temp]);

  const activeCount = DEVICE_CARDS.filter((d) => d.state === "on").length;
  const gaugeBg =
    "conic-gradient(from -220deg, #8a2be2 0deg " +
    Math.round(gaugeDeg) +
    "deg, #d8d8e4 " +
    Math.round(gaugeDeg) +
    "deg 260deg, transparent 260deg 360deg)";

  return (
    <Box className="min-h-screen grid grid-cols-1 md:grid-cols-[112px_1fr] bg-[#eff0f3]">
      <Sidebar activeItem="Devices" />

      <main className="m-4 rounded-[18px] bg-[#f8f8fb] px-4 pt-4 pb-6">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <TextField.Root
            size="3"
            className="w-full max-w-[560px]"
            placeholder="Search using keywords or name ..."
          >
            <TextField.Slot>⌕</TextField.Slot>
          </TextField.Root>

          <Flex align="center" gap="3">
            <Avatar fallback="JW" radius="full" size="3" />
            <Box>
              <Text weight="medium">Jasica Williamson</Text>
              <Text size="2" color="gray">Khu vực 1 &gt; Tầng 1 &gt; Phòng 1</Text>
            </Box>
            <IconButton variant="ghost">⋮</IconButton>
          </Flex>
        </header>

        <Tabs.Root defaultValue="overview" className="mt-4">
          <Tabs.List>
            <Tabs.Trigger value="overview">Tổng quan</Tabs.Trigger>
            <Tabs.Trigger value="list">Danh sách</Tabs.Trigger>
            <Tabs.Trigger value="card">Thẻ</Tabs.Trigger>
          </Tabs.List>
        </Tabs.Root>

        {loading && (
          <Card className="mt-4 bg-white">
            <Text>Loading telemetry...</Text>
          </Card>
        )}

        {error && (
          <Card className="mt-4 bg-white text-[#bb173d]">
            <Text>Error: {error}</Text>
          </Card>
        )}

        {!loading && !error && (
          <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1fr_minmax(220px,220px)]">
            <section className="grid gap-4">
              <Card className="rounded-2xl bg-[#efeaf9]">
                <Flex justify="between" align="center" className="mb-3">
                  <Flex align="center" gap="2">
                    <div className="grid h-8 w-8 place-items-center rounded-full bg-[#ddd4ff]">✹</div>
                    <Heading size="4">Air Conditioner</Heading>
                  </Flex>
                  <Flex align="center" gap="2">
                    <Text weight="bold">ON</Text>
                    <Switch defaultChecked />
                  </Flex>
                </Flex>

                <div className="mt-2 flex items-center justify-center gap-5">
                  <button
                    className="h-9 w-[42px] rounded-xl border-0 bg-[#e2d8ff] text-[26px] leading-none text-[#24117e]"
                    type="button"
                  >
                    −
                  </button>

                  <div
                    className="relative grid h-[250px] w-[250px] place-items-center rounded-full [filter:drop-shadow(0_8px_18px_rgba(28,20,85,0.15))]"
                    style={{ background: gaugeBg }}
                  >
                    <div className="grid h-48 w-48 place-items-center rounded-full bg-[#f7f7fb] text-center">
                      <Text size="2" color="gray">Goal</Text>
                      <Heading size="8">{temp} °C</Heading>
                    </div>
                  </div>

                  <button
                    className="h-9 w-[42px] rounded-xl border-0 bg-[#e2d8ff] text-[26px] leading-none text-[#24117e]"
                    type="button"
                  >
                    +
                  </button>
                </div>

                <Flex justify="between" className="mx-6 mt-3">
                  <Text color="gray">10 °C</Text>
                  <Text color="gray">30 °C</Text>
                </Flex>
              </Card>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {DEVICE_CARDS.map((device) => {
                  const isOn = device.state === "on";
                  return (
                    <Card
                      key={device.key}
                      className={
                        "rounded-2xl " +
                        (isOn ? "bg-[#15078d] text-white" : "bg-[#e8ddfb] text-[#1b1a29]")
                      }
                    >
                      <Flex justify="between" align="center">
                        <Text className="text-4xl font-bold lowercase leading-none">{device.state}</Text>
                        <Switch defaultChecked={isOn} />
                      </Flex>
                      <Separator size="4" my="3" />
                      <Text weight="medium">{device.title}</Text>
                    </Card>
                  );
                })}
              </div>
            </section>

            <section className="grid max-w-[220px] grid-cols-1 gap-3">
              <Card className="flex min-h-[100px] w-full flex-col items-center justify-center gap-2 rounded-[14px] bg-[#ffd8a8] p-3">
                <img src={tempImg} alt="Temperature" className="h-11 w-11 object-contain" />
                <Text color="gray" align="center">Temperature</Text>
                <Heading size="8">+ {temp} °C</Heading>
              </Card>

              <Card className="flex min-h-[100px] w-full flex-col items-center justify-center gap-2 rounded-[14px] bg-[#74b7e4] p-3">
                <img src={humidityImg} alt="Humidity" className="h-11 w-11 object-contain" />
                <Text color="gray" align="center">Humidity</Text>
                <Heading size="8">{hum} %</Heading>
              </Card>

              <Card className="flex min-h-[100px] w-full flex-col items-center justify-center gap-2 rounded-[14px] bg-[#f0ecf8] p-3">
                <Text color="gray" align="center">Active/All</Text>
                <Heading size="8">
                  {activeCount}/{DEVICE_CARDS.length}
                </Heading>
                <Badge mt="2" color="gray" variant="soft">
                  {ts ? new Date(Number(ts)).toLocaleString() : "No timestamp"}
                </Badge>
              </Card>
            </section>
          </div>
        )}
      </main>
    </Box>
  );
}