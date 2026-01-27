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
  Filler,
);

const socket = io("http://localhost:5000/");
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
    JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"),
  );

  /* ================= ALARM STATE ================= */
  const silentSeconds = useRef({});
  const alarmActive = useRef({});

  /* ================= LOAD ================= */
  useEffect(() => {
    axios.get("http://localhost:5000/api/devices").then((res) => {
      setInterfaces(res.data.interfaces);
      console.log(res.data);
    });

    // Polling every 1 second to fetch interface data
    const interval = setInterval(() => {
      console.log("Polling for interfaces..."); // Debug log for polling
      axios.get("http://localhost:5000/api/devices").then((res) => {
        setInterfaces([...res.data.interfaces]); // Update interfaces every 1 second
      });
    }, 1000); // 1 second interval

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

              /* After 10 seconds â†’ alarm ON */
              if (silentSeconds.current[key] === 10) {
                // speak("Interface traffic failed");
                alarmActive.current[key] = true;
              }

              /* Repeat every 5 seconds */
              if (
                alarmActive.current[key] &&
                silentSeconds.current[key] > 10 &&
                (silentSeconds.current[key] - 10) % 5 === 0
              ) {
                // speak("Interface traffic failed");
              }
            } else {
              /* Bandwidth restored */
              if (alarmActive.current[key]) {
                // speak("Bandwidth stable");
              }
              silentSeconds.current[key] = 0;
              alarmActive.current[key] = false;
            }
          });
        });

        return next;
      });
    });

    return () => {
      clearInterval(interval); // Cleanup polling
      socket.off("traffic");
    };
  }, []);

  /* ================= ACTIONS ================= */
  const save = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(selected));
    setShow(false); // Close popup after adding
  };

  const remove = (key) => {
    const updated = selected.filter((x) => x !== key);
    setSelected(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  /* ================= UI ================= */
  return (
    <div
      style={{
        padding: 20,
        fontFamily: "Arial, sans-serif",
        backgroundColor: "#f5f5f5",
        minHeight: "100vh",
      }}
    >
      {/* Header with title and search in top left */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
        }}
      >
        <input
          placeholder="Search device / interface"
          value={search}
          onFocus={() => setShow(true)}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: "300px",
            padding: 12,
            border: "1px solid #ccc",
            borderRadius: 8,
            fontSize: 16,
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
          }}
        />
        <h1 style={{ margin: 0, color: "#333" }}>
          Network Interface Traffic Monitor
        </h1>
      </div>

      {show && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
          }}
          onClick={() => setShow(false)} // Close on backdrop click
        >
          <div
            style={{
              background: "#fff",
              border: "1px solid #ccc",
              padding: "20px",
              width: "1200px",
              height: "600px",
              overflowY: "auto",
              boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
              position: "relative",
              borderRadius: 8,
            }}
            onClick={(e) => e.stopPropagation()} // Prevent closing on content click
          >
            {/* Add Selected Interfaces button in top left corner */}
            <button
              onClick={save}
              style={{
                position: "absolute",
                top: "10px",
                left: "10px",
                padding: "12px 20px",
                backgroundColor: "#2196F3",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                cursor: "pointer",
                fontSize: 16,
                fontWeight: "bold",
                boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                transition: "background-color 0.2s",
              }}
              onMouseEnter={(e) => (e.target.style.backgroundColor = "#1976D2")}
              onMouseLeave={(e) => (e.target.style.backgroundColor = "#2196F3")}
            >
              Add Selected Interfaces
            </button>

            {/* Cross icon to close in top right */}
            <button
              onClick={() => setShow(false)}
              style={{
                position: "absolute",
                top: "10px",
                right: "10px",
                background: "none",
                border: "none",
                fontSize: "18px",
                cursor: "pointer",
                color: "#666",
              }}
            >
              âœ•
            </button>

            <h2 style={{ marginBottom: 20, color: "#333", marginTop: 50 }}>
              Select Interfaces
            </h2>

            {/* Search bar inside popup */}
            <input
              placeholder="Search device / interface"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: "100%",
                padding: "10px",
                marginBottom: "20px",
                border: "1px solid #ccc",
                borderRadius: 4,
                fontSize: 14,
              }}
            />

            <div style={{ marginBottom: 20 }}>
              {interfaces
                .filter((i) => {
                  // Filter by search
                  const matchesSearch =
                    `${i.device_name} ${i.ifName} ${i.ifDescr} ${i.ifAlias}`
                      .toLowerCase()
                      .includes(search.toLowerCase());

                  // Filter for UP status
                  const isUp = i.ifOperStatus === 1;

                  // If traffic data is available, also filter for interfaces with traffic (rx > 0 or tx > 0)
                  // Otherwise, show all matching search and UP
                  const hasTraffic =
                    Object.keys(traffic).length > 0
                      ? traffic[i.device_id] &&
                        traffic[i.device_id][i.ifIndex] &&
                        (traffic[i.device_id][i.ifIndex].rx > 0 ||
                          traffic[i.device_id][i.ifIndex].tx > 0)
                      : true;

                  return matchesSearch && isUp && hasTraffic;
                })
                .map((i) => {
                  const key = `${i.device_id}_${i.ifIndex}`;
                  return (
                    <div
                      key={key}
                      style={{
                        marginBottom: "10px",
                        padding: "15px",
                        border: "1px solid #eee",
                        borderRadius: 8,
                        cursor: "pointer",
                        transition: "background-color 0.2s, box-shadow 0.2s",
                        backgroundColor: "#fafafa",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "#ffffff";
                        e.currentTarget.style.boxShadow =
                          "0 2px 8px rgba(0,0,0,0.1)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "#fafafa";
                        e.currentTarget.style.boxShadow = "none";
                      }}
                    >
                      <label style={{ display: "flex", alignItems: "center" }}>
                        <input
                          type="checkbox"
                          checked={selected.includes(key)}
                          onChange={(e) =>
                            e.target.checked
                              ? setSelected([...selected, key])
                              : setSelected(selected.filter((x) => x !== key))
                          }
                          style={{
                            marginRight: "15px",
                            transform: "scale(1.2)",
                          }}
                        />
                        <div style={{ display: "flex", alignItems: "center" }}>
                          <div
                            style={{
                              fontWeight: "bold",
                              fontSize: 16,
                              color: "#333",
                            }}
                          >
                            {i.device_name} :{" "}
                          </div>
                          <div
                            style={{
                              fontSize: "14px",
                              color: "#666",
                              marginLeft: 10,
                            }}
                          >
                            {" "}
                            {i.ifDescr}
                          </div>
                          <div
                            style={{
                              fontSize: "14px",
                              color: "#666",
                              marginLeft: 10,
                            }}
                          >
                            {i.ifAlias}
                          </div>
                          <div
                            style={{
                              fontSize: "12px",
                              color: "#888",
                              marginLeft: 10,
                            }}
                          >
                            Status:{" "}
                            <span
                              style={{
                                color:
                                  i.ifOperStatus === 1 ? "#4CAF50" : "#F44336",
                                fontWeight: "900",
                              }}
                            >
                              {i.ifOperStatus === 1 ? "UP" : "DOWN"}
                            </span>
                          </div>
                        </div>
                      </label>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))",
          gap: 20,
          marginTop: 20,
        }}
      >
        {selected.map((key) => {
          const [devId, ifIndex] = key.split("_");
          const iface = interfaces.find(
            (x) => x.device_id == devId && x.ifIndex == ifIndex,
          );

          const h = history[key] || { rx: [], tx: [] };
          const cur = traffic?.[devId]?.[ifIndex] || { rx: 0, tx: 0 };

          return (
            <div
              key={key}
              style={{
                background: "#fff",
                padding: 20,
                borderRadius: 12,
                boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                border: "1px solid #e0e0e0",
                position: "relative",
                width: "350px",
                height: "280px",
              }}
            >
              <button
                onClick={() => remove(key)}
                style={{
                  position: "absolute",
                  top: 10,
                  right: 10,
                  background: "none",
                  border: "none",
                  fontSize: "18px",
                  cursor: "pointer",
                  color: "#666",
                }}
              >
                âœ•
              </button>

              <div style={{ marginBottom: 10 }}>
                <h3 style={{ margin: 0, color: "#333", fontSize: 18 }}>
                  {iface?.device_name}
                </h3>
                <div style={{ display: "flex" }}>
                  <p
                    style={{
                      margin: 5,
                      color: "#666",
                      fontSize: 14,
                    }}
                  >
                    {iface?.ifDescr}
                  </p>
                  <p
                    style={{
                      margin: 5,
                      color: "#666",
                      fontSize: 14,
                      marginLeft: 10,
                    }}
                  >
                    - {iface?.ifAlias}
                  </p>
                </div>
                <p style={{ margin: 5, color: "#888", fontSize: 12 }}>
                  Port Status:{" "}
                  <span
                    style={{
                      color: iface?.ifOperStatus === 1 ? "#4CAF50" : "#F44336",
                      fontWeight: "bold",
                    }}
                  >
                    {iface?.ifOperStatus === 1 ? "UP" : "DOWN"}
                  </span>
                </p>
              </div>

              <div
                style={{
                  margin: "10px 0",
                  fontWeight: "bold",
                  fontSize: 14,
                  color: "#333",
                }}
              >
                TX: {formatBps(cur.tx)} | RX: {formatBps(cur.rx)}
              </div>

              <div style={{ height: 150 }}>
                {" "}
                {/* Adjusted height to fit within 280px card */}
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
                        backgroundColor: "rgba(76,175,80,0.2)", // Professional green
                        borderColor: "#4CAF50",
                        borderWidth: 2,
                      },
                      {
                        label: "TX (Mbps)",
                        data: h.tx,
                        tension: 0.4,
                        pointRadius: 0,
                        fill: true,
                        backgroundColor: "rgba(33,150,243,0.2)", // Professional blue
                        borderColor: "#2196F3",
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
                      legend: {
                        position: "bottom",
                        labels: { font: { size: 12 } },
                      },
                      tooltip: {
                        backgroundColor: "rgba(0,0,0,0.8)",
                        titleColor: "#fff",
                        bodyColor: "#fff",
                      },
                    },
                    scales: {
                      x: {
                        grid: { display: false },
                        ticks: { display: false },
                      },
                      y: {
                        beginAtZero: true,
                        grid: { color: "rgba(0,0,0,0.1)" },
                      },
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
