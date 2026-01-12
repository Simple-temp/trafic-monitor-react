import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { io } from "socket.io-client";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Legend,
  Tooltip,
  Filler,
} from "chart.js";

ChartJS.register(
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Legend,
  Tooltip,
  Filler
);

const socket = io("http://localhost:5000");
const STORAGE_KEY = "selectedInterfaces";

/* ================= SPEED FORMATTER ================= */
function formatBps(bps = 0) {
  if (bps < 1_000) return `${bps.toFixed(0)} bps`;
  if (bps < 1_000_000) return `${(bps / 1_000).toFixed(2)} Kbps`;
  if (bps < 1_000_000_000) return `${(bps / 1_000_000).toFixed(2)} Mbps`;
  return `${(bps / 1_000_000_000).toFixed(2)} Gbps`;
}

/* ================= SPEAK ================= */
function speak(text) {
  if (!window.speechSynthesis) return;
  const msg = new SpeechSynthesisUtterance(text);
  msg.rate = 1;
  msg.pitch = 1;
  msg.volume = 1;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(msg);
}

export default function LiveGraph() {
  const [interfaces, setInterfaces] = useState([]);
  const [traffic, setTraffic] = useState({});
  const [history, setHistory] = useState({});
  const [search, setSearch] = useState("");
  const [show, setShow] = useState(false);
  const [selected, setSelected] = useState(
    JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]")
  );

  /* ================= ALARM STATE ================= */
  const silentSeconds = useRef({});
  const alarmActive = useRef({});

  /* ================= LOAD ================= */
  useEffect(() => {
    axios.get("http://localhost:5000/api/devices").then((res) => {
      setInterfaces(res.data.interfaces);
    });

    socket.on("traffic", (data) => {
      setTraffic(data);

      setHistory((prev) => {
        const next = { ...prev };

        Object.entries(data).forEach(([devId, ifs]) => {
          Object.entries(ifs).forEach(([ifIndex, v]) => {
            const key = `${devId}_${ifIndex}`;
            if (!next[key]) next[key] = { rx: [], tx: [] };

            /* GRAPH (Mbps) */
            next[key].rx.push(v.rx / 1_000_000);
            next[key].tx.push(v.tx / 1_000_000);
            if (next[key].rx.length > 30) next[key].rx.shift();
            if (next[key].tx.length > 30) next[key].tx.shift();

            /* ================= ALARM LOGIC ================= */
            if (v.rx === 0 && v.tx === 0) {
              silentSeconds.current[key] =
                (silentSeconds.current[key] || 0) + 1;

              /* After 10 seconds → alarm ON */
              if (silentSeconds.current[key] === 10) {
                speak("Interface traffic failed");
                alarmActive.current[key] = true;
              }

              /* Repeat every 5 seconds */
              if (
                alarmActive.current[key] &&
                silentSeconds.current[key] > 10 &&
                (silentSeconds.current[key] - 10) % 5 === 0
              ) {
                speak("Interface traffic failed");
              }
            } else {
              /* Bandwidth restored */
              if (alarmActive.current[key]) {
                speak("Bandwidth stable");
              }
              silentSeconds.current[key] = 0;
              alarmActive.current[key] = false;
            }
          });
        });

        return next;
      });
    });

    return () => socket.off("traffic");
  }, []);

  /* ================= ACTIONS ================= */
  const save = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(selected));
    setShow(false);
  };

  const remove = (key) => {
    const updated = selected.filter((x) => x !== key);
    setSelected(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  /* ================= UI ================= */
  return (
    <div style={{ padding: 20 }}>
      <input
        placeholder="Search device / interface"
        value={search}
        onFocus={() => setShow(true)}
        onChange={(e) => setSearch(e.target.value)}
        style={{ width: "100%", padding: 12 }}
      />

      {show && (
        <div
          style={{
            background: "#fff",
            border: "1px solid #ccc",
            padding: 7,
            maxHeight: 220,
            overflowY: "auto",
          }}
        >
          {interfaces
            .filter((i) =>
              `${i.device_name} ${i.ifName} ${i.ifDescr}`
                .toLowerCase()
                .includes(search.toLowerCase())
            )
            .map((i) => {
              const key = `${i.device_id}_${i.ifIndex}`;
              return (
                <label
                  key={key}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 6,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(key)}
                    onChange={(e) =>
                      e.target.checked
                        ? setSelected([...selected, key])
                        : setSelected(selected.filter((x) => x !== key))
                    }
                  />
                  <span style={{ flex: 1, marginLeft: 6 }}>
                    <b>{i.device_name}</b> | {i.ifDescr}
                  </span>
                  <span
                    style={{
                      fontWeight: "bold",
                      color: i.ifOperStatus === 1 ? "green" : "red",
                    }}
                  >
                    {i.ifOperStatus === 1 ? "UP" : "DOWN"}
                  </span>
                </label>
              );
            })}
          <button onClick={save}>Add Selected</button>
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill,minmax(360px,1fr))",
          gap: 20,
          marginTop: 20,
        }}
      >
        {selected.map((key) => {
          const [devId, ifIndex] = key.split("_");
          const iface = interfaces.find(
            (x) => x.device_id == devId && x.ifIndex == ifIndex
          );

          const h = history[key] || { rx: [], tx: [] };
          const cur = traffic?.[devId]?.[ifIndex] || { rx: 0, tx: 0 };

          return (
            <div
              key={key}
              style={{
                background: "#fff",
                padding: 15,
                borderRadius: 6,
                boxShadow: "0 1px 4px rgba(0,0,0,.15)",
              }}
            >
              <button onClick={() => remove(key)} style={{ float: "right" }}>
                ✕
              </button>

              <div><b>{iface?.device_name}</b></div>
              <div>{iface?.ifName}</div>
              <div style={{ fontSize: 13 }}>{iface?.ifDescr}</div>

              <div style={{ margin: "6px 0", fontWeight: "bold" }}>
                TX: {formatBps(cur.tx)} | RX: {formatBps(cur.rx)}
              </div>

              <div style={{ height: 300 }}>
                <Line
                  data={{
                    labels: h.rx.map((_, i) => i + 1),
                    datasets: [
                      {
                        label: "RX (Mbps)",
                        data: h.rx,
                        tension: 0.4,
                        pointRadius: 0,
                        fill: true,
                        backgroundColor: "rgba(33,150,243,.35)",
                        borderWidth: 2,
                      },
                      {
                        label: "TX (Mbps)",
                        data: h.tx,
                        tension: 0.4,
                        pointRadius: 0,
                        fill: true,
                        backgroundColor: "rgba(244,67,54,.35)",
                        borderWidth: 2,
                      },
                    ],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    animation: {
                      duration: 600,
                      easing: "linear",
                    },
                    plugins: {
                      legend: { position: "bottom" },
                    },
                    scales: {
                      y: { beginAtZero: true },
                    },
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
