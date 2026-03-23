import {useEffect, useState} from 'react';

export default function Detail(){
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [payload, setPayload] = useState(null);

    useEffect(() => {
        let alive = true;

        // Fetch data from appcoreiot
        async function loadData() {
        try {
            setLoading(true);
            setError("");

            const res = await fetch("http://localhost:5000/data");
            if (!res.ok) {
                throw new Error("Request failed with status " + res.status);
            }

            const json = await res.json();
            if (alive) {
                setPayload(json);
            }
        } catch (err) {
            if (alive) {
                setError(err.message || "Failed to fetch data");
            }
        } finally {
            if (alive) {
                setLoading(false);
            }
        }
        }

    loadData();
    const timer = setInterval(loadData, 10000);

    return () => {
        alive = false;
        clearInterval(timer);
    };
    }, []);

    const temp = payload?.data?.temperature?.[0]?.value;
    const hum = payload?.data?.humidity?.[0]?.value;
    const ts = payload?.data?.temperature?.[0]?.ts || payload?.data?.humidity?.[0]?.ts;
    console.log(payload)
    return (
        <div style={{ maxWidth: 640, margin: "40px auto", fontFamily: "sans-serif", padding: 16 }}>
        <h1>Device Telemetry</h1>

        {loading && <p>Loading...</p>}
        {error && <p style={{ color: "crimson" }}>Error: {error}</p>}

        {!loading && !error && (
        <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 16 }}>
        <p><strong>Device ID:</strong> {payload?.deviceId || "-"}</p>
        <p><strong>Temperature:</strong> {temp ?? "-"} C</p>
        <p><strong>Humidity:</strong> {hum ?? "-"} %</p>
        <p><strong>Latest Time:</strong> {ts ? new Date(Number(ts)).toLocaleString() : "-"}</p>
        </div>
        )}
        </div>
    );
}
