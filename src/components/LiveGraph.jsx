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

const socket = io("http://172.17.0.50:5000");
const STORAGE_KEY = "selectedInterfaces";

/* ================= SPEED FORMATTER ================= */
function formatBps(bps = 0) {
  if (bps < 1_000) return `${bps.toFixed(0)} bps`;
  if (bps < 1_000_000) return `${(bps / 1_000).toFixed(2)} Kbps`;
  if (bps < 1_000_000_000) return `${(bps / 1_000_000).toFixed(2)} Mbps`;
  return `${(bps / 1_000_000_000).toFixed(2)} Gbps`;
}

/* ================= OCTET FORMATTER ================= */
function formatOctets(octets = 0) {
  if (octets < 1_000) return `${octets.toFixed(0)} B`;
  if (octets < 1_000_000) return `${(octets / 1_000).toFixed(2)} KB`;
  if (octets < 1_000_000_000) return `${(octets / 1_000_000).toFixed(2)} MB`;
  if (octets < 1_000_000_000_000) return `${(octets / 1_000_000_000).toFixed(2)} GB`;
  return `${(octets / 1_000_000_000_000).toFixed(2)} TB`;
}

export default function LiveGraph() {
  const [interfaces, setInterfaces] = useState([]);
  const [traffic, setTraffic] = useState({});
  const [history, setHistory] = useState({});
  const [search, setSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [isConnected, setIsConnected] = useState(socket.connected); // Connection Status State
  const [selected, setSelected] = useState(
    JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"),
  );

  const searchRef = useRef(null);
  const silentSeconds = useRef({});
  const alarmActive = useRef({});

  /* ================= LOAD & SOCKETS ================= */
  useEffect(() => {
    // Initial fetch
    axios.get("http://172.17.0.50/api/devices").then((res) => {
      setInterfaces(res.data.interfaces);
    });

    // Connection Listeners
    socket.on("connect", () => setIsConnected(true));
    socket.on("disconnect", () => setIsConnected(false));

    socket.on("traffic", (data) => {
      setTraffic(data);
      setHistory((prev) => {
        const next = { ...prev };
        Object.entries(data).forEach(([devId, ifs]) => {
          Object.entries(ifs).forEach(([ifIndex, v]) => {
            const key = `${devId}_${ifIndex}`;
            if (!next[key]) next[key] = { rx: [], tx: [] };

            next[key].rx.push(v.rx / 1_000_000);
            next[key].tx.push(v.tx / 1_000_000);
            if (next[key].rx.length > 30) next[key].rx.shift();
            if (next[key].tx.length > 30) next[key].tx.shift();

            // Alarm Logic
            if (v.rx === 0 && v.tx === 0) {
              silentSeconds.current[key] = (silentSeconds.current[key] || 0) + 1;
              if (silentSeconds.current[key] === 10) alarmActive.current[key] = true;
            } else {
              silentSeconds.current[key] = 0;
              alarmActive.current[key] = false;
            }
          });
        });
        return next;
      });
    });

    // Set to 1000ms (1s) as requested
    const interval = setInterval(() => {
      axios.get("http://172.17.0.50/api/devices").then((res) => {
        setInterfaces(res.data.interfaces);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(selected));
      });
    }, 1000);

    return () => {
      clearInterval(interval);
      socket.off("connect");
      socket.off("disconnect");
      socket.off("traffic");
    };
  }, [selected]);

  /* ================= OUTSIDE CLICK HANDLER ================= */
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const addInterface = (key) => {
    if (!selected.includes(key)) {
      const updated = [...selected, key];
      setSelected(updated);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    }
    setSearch("");
    setShowDropdown(false);
  };

  const remove = (key) => {
    const updated = selected.filter((x) => x !== key);
    setSelected(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const filteredInterfaces = interfaces.filter((i) => {
    const matchesSearch = `${i.device_name} ${i.ifName} ${i.ifDescr} ${i.ifAlias}`
      .toLowerCase()
      .includes(search.toLowerCase());
    return matchesSearch && i.ifOperStatus === 1;
  });

  return (
    <div style={{ padding: 20, fontFamily: "Arial, sans-serif", backgroundColor: "#f5f5f5", minHeight: "100vh" }}>
      
      {/* Real-time Socket Status Alert */}
      <div style={{
        padding: '10px 20px',
        marginBottom: '20px',
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 'bold',
        fontSize: '14px',
        backgroundColor: isConnected ? '#d4edda' : '#f8d7da',
        color: isConnected ? '#155724' : '#721c24',
        border: `1px solid ${isConnected ? '#c3e6cb' : '#f5c6cb'}`,
        transition: 'all 0.3s ease'
      }}>
        <span style={{ 
          height: '10px', 
          width: '10px', 
          backgroundColor: isConnected ? '#28a745' : '#dc3545', 
          borderRadius: '50%', 
          display: 'inline-block', 
          marginRight: '10px' 
        }}></span>
        {isConnected ? "Socket.io Connected: Receiving Real-time Traffic" : "Socket.io Disconnected: Attempting to Reconnect..."}
      </div>

      <div style={{ marginBottom: 20, position: "relative" }} ref={searchRef}>
        <input
          placeholder="Search device / interface"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setShowDropdown(e.target.value.length > 0);
          }}
          onFocus={() => setShowDropdown(search.length > 0)}
          style={{
            width: "100%", padding: 15, border: "1px solid #ccc", borderRadius: 8, fontSize: 18,
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)", outline: "none",
          }}
        />
        {showDropdown && (
          <div style={{
            position: "absolute", top: "100%", left: 0, right: 0, background: "#fff",
            border: "1px solid #ccc", borderRadius: 8, boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
            maxHeight: 300, overflowY: "auto", zIndex: 1000,
          }}>
            {filteredInterfaces.length > 0 ? (
              filteredInterfaces.map((i) => {
                const key = `${i.device_id}_${i.ifIndex}`;
                return (
                  <div key={key} style={{ padding: 15, borderBottom: "1px solid #eee", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <strong>{i.device_name}</strong> : {i.ifDescr} - {i.ifAlias}
                      <span style={{ marginLeft: 10, color: i.ifOperStatus === 1 ? "#4CAF50" : "#F44336", fontWeight: "bold" }}>
                        ({i.ifOperStatus === 1 ? "UP" : "DOWN"})
                      </span>
                    </div>
                    <button onClick={() => addInterface(key)} style={{ padding: "8px 16px", backgroundColor: "#2196F3", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer" }}>Add</button>
                  </div>
                );
              })
            ) : <div style={{ padding: 15, textAlign: "center", color: "#666" }}>No interfaces found</div>}
          </div>
        )}
      </div>

      <h1 style={{ margin: 0, color: "#333", textAlign: "center" }}>Network Interface Traffic Monitor</h1>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))", gap: 20, marginTop: 20 }}>
        {selected.map((key) => {
          const [devId, ifIndex] = key.split("_");
          const iface = interfaces.find((x) => x.device_id == devId && x.ifIndex == ifIndex);
          const h = history[key] || { rx: [], tx: [] };
          const rxData = h.rx.length > 0 ? h.rx : [0];
          const txData = h.tx.length > 0 ? h.tx : [0];
          const labels = rxData.map((_, i) => i + 1);

          return (
            <div key={key} style={{ background: "#fff", padding: 20, borderRadius: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.15)", border: "1px solid #e0e0e0", position: "relative", width: "380px", height: "280px" }}>
              <button onClick={() => remove(key)} style={{ position: "absolute", top: 10, right: 10, background: "none", border: "none", fontSize: "18px", cursor: "pointer", color: "#666" }}>?</button>
              <div style={{ marginBottom: 10 }}>
                <h3 style={{ margin: 0, color: "#333", fontSize: 18 }}>{iface?.device_name}</h3>
                <p style={{ margin: 5, color: "#666", fontSize: 14 }}>{iface?.ifDescr} - {iface?.ifAlias}</p>
                <p style={{ margin: 5, color: "#888", fontSize: 12 }}>
                  RX: {formatOctets(iface?.ifInOctets || 0)} | TX: {formatOctets(iface?.ifOutOctets || 0)}
                </p>
              </div>
              <div style={{ height: 150 }}>
                <Line
                  data={{
                    labels,
                    datasets: [
                      { label: "RX (Mbps)", data: rxData, tension: 0.4, pointRadius: 0, fill: true, backgroundColor: "rgba(33,150,243,0.2)", borderColor: "#2196F3", borderWidth: 2 },
                      { label: "TX (Mbps)", data: txData, tension: 0.4, pointRadius: 0, fill: '+1', backgroundColor: "rgba(255,0,255,0.2)", borderColor: "#FF00FF", borderWidth: 2 },
                    ],
                  }}
                  options={{
                    responsive: true, maintainAspectRatio: false,
                    animation: { duration: 600, easing: "linear" },
                    plugins: { legend: { position: "bottom" } },
                    scales: { x: { display: false }, y: { beginAtZero: true } },
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