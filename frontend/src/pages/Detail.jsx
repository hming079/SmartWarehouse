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
import "../App.css";


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
    <Box className="sw-root">
      <Sidebar activeItem="Devices" />

      <main className="sw-main">
        <header className="sw-topbar">
          <TextField.Root
            size="3"
            className="sw-search"
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

        <Tabs.Root defaultValue="overview" className="sw-tabs">
          <Tabs.List>
            <Tabs.Trigger value="overview">Tổng quan</Tabs.Trigger>
            <Tabs.Trigger value="list">Danh sách</Tabs.Trigger>
            <Tabs.Trigger value="card">Thẻ</Tabs.Trigger>
          </Tabs.List>
        </Tabs.Root>

        {loading && (
          <Card className="sw-status-card">
            <Text>Loading telemetry...</Text>
          </Card>
        )}

        {error && (
          <Card className="sw-status-card sw-error">
            <Text>Error: {error}</Text>
          </Card>
        )}

        {!loading && !error && (
          <div className="sw-content-grid">
            {/* <section className="sw-center-col">
              <Card className="sw-main-card">
                <Flex justify="between" align="center" className="sw-main-card-head">
                  <Flex align="center" gap="2">
                    <div className="sw-chip-icon">✹</div>
                    <Heading size="4">Air Conditioner</Heading>
                  </Flex>
                  <Flex align="center" gap="2">
                    <Text weight="bold">ON</Text>
                    <Switch defaultChecked />
                  </Flex>
                </Flex>

                <div className="sw-gauge-wrap">
                  <button className="sw-round-btn" type="button">−</button>

                  <div className="sw-gauge-outer" style={{ background: gaugeBg }}>
                    <div className="sw-gauge-inner">
                      <Text size="2" color="gray">Goal</Text>
                      <Heading size="8">{temp} °C</Heading>
                    </div>
                  </div>

                  <button className="sw-round-btn" type="button">+</button>
                </div>

                <Flex justify="between" className="sw-min-max">
                  <Text color="gray">10 °C</Text>
                  <Text color="gray">30 °C</Text>
                </Flex>
              </Card>

              <div className="sw-device-grid">
                {DEVICE_CARDS.map((device) => {
                  const isOn = device.state === "on";
                  return (
                    <Card key={device.key} className={"sw-device-card" + (isOn ? " on" : "")}>
                      <Flex justify="between" align="center">
                        <Text className="sw-device-state">{device.state}</Text>
                        <Switch defaultChecked={isOn} />
                      </Flex>
                      <Separator size="4" my="3" />
                      <Text weight="medium">{device.title}</Text>
                    </Card>
                  );
                })}
              </div>
            </section> */}

            <section className="sw-right-col">
              <Card className="sw-side-stat sw-side-stat-temp">
                <img src={tempImg} alt="Temperature" className="sw-side-stat-img sw-side-img-temp" />
                <Text color="gray" align="center">Temperature</Text>
                <Heading size="8">+ {temp} °C</Heading>
              </Card>

              <Card className="sw-side-stat sw-side-stat-humidity">
                <img src={humidityImg} alt="Humidity" className="sw-side-stat-img sw-side-img-humidity" />
                <Text color="gray" align="center">Humidity</Text>
                <Heading size="8">{hum} %</Heading>
              </Card>
              <Card className="sw-side-stat">
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