import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { io } from "socket.io-client";

const socket = io("http://localhost:5000");
const STORAGE_KEY = "selectedports";

/* ================= UTIL ================= */
function formatBps(bps = 0) {
  if (bps < 1_000) return `${bps.toFixed(0)} bps`;
  if (bps < 1_000_000) return `${(bps / 1_000).toFixed(2)} Kbps`;
  if (bps < 1_000_000_000) return `${(bps / 1_000_000).toFixed(2)} Mbps`;
  return `${(bps / 1_000_000_000).toFixed(2)} Gbps`;
}

function speak(text) {
  if (!window.speechSynthesis) return;
  const msg = new SpeechSynthesisUtterance(text);
  msg.rate = 0.95;
  msg.pitch = 1;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(msg);
}

const babyCry = new Audio(
  "https://actions.google.com/sounds/v1/human_voices/baby_crying.ogg"
);

/* ================= COMPONENT ================= */
export default function PortList() {
  const [interfaces, setInterfaces] = useState([]);
  const [traffic, setTraffic] = useState({});
  const [statuses, setStatuses] = useState({}); // Track current statuses: {devId: {ifIndex: status}}
  const [search, setSearch] = useState("");
  const [show, setShow] = useState(false);
  const [selected, setSelected] = useState(
    JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]")
  );

  /* ================= STATUS MEMORY ================= */
  const lastStatus = useRef({});
  const timers = useRef({}); // per-port timers for alarms

  /* ================= LOAD INTERFACES ================= */
  useEffect(() => {
    axios.get("http://localhost:5000/api/devices").then((res) => {
      setInterfaces(res.data.interfaces);
      // Initialize statuses from initial data
      const initialStatuses = {};
      res.data.interfaces.forEach(iface => {
        if (!initialStatuses[iface.device_id]) initialStatuses[iface.device_id] = {};
        initialStatuses[iface.device_id][iface.ifIndex] = iface.ifOperStatus;
      });
      setStatuses(initialStatuses);
    });
  }, []);

  /* ================= TRAFFIC AND ALARM HANDLER ================= */
  useEffect(() => {
    const handleTraffic = (data) => {
      setTraffic(data);

      // Update statuses assuming data includes status: {devId: {ifIndex: {rx, tx, status}}}
      const newStatuses = { ...statuses };
      Object.entries(data).forEach(([devId, ifs]) => {
        if (!newStatuses[devId]) newStatuses[devId] = {};
        Object.entries(ifs).forEach(([ifIndex, v]) => {
          if (v.status !== undefined) {
            newStatuses[devId][ifIndex] = v.status;
          }
        });
      });
      setStatuses(newStatuses);

      // Alarm logic for selected ports
      Object.entries(data).forEach(([devId, ifs]) => {
        Object.entries(ifs).forEach(([ifIndex, v]) => {
          const key = `${devId}_${ifIndex}`;
          if (!selected.includes(key)) return;

          const currentStatus = v.status === 1 ? "UP" : "DOWN";
          const prevStatus = lastStatus.current[key];

          if (prevStatus && prevStatus !== currentStatus) {
            // Clear existing timer for this port
            if (timers.current[key]) {
              clearTimeout(timers.current[key]);
              delete timers.current[key];
            }

            // Set delayed alarm based on status change
            if (currentStatus === "DOWN") {
              timers.current[key] = setTimeout(() => {
                const iface = interfaces.find(i => i.device_id == devId && i.ifIndex == ifIndex);
                if (iface) {
                  speak(`Alert! ${iface.device_name} ${iface.ifName} port is down`);
                  babyCry.play();
                }
                delete timers.current[key];
              }, 10000); // 10 seconds delay for DOWN
            } else if (currentStatus === "UP") {
              timers.current[key] = setTimeout(() => {
                const iface = interfaces.find(i => i.device_id == devId && i.ifIndex == ifIndex);
                if (iface) {
                  speak(`${iface.device_name} ${iface.ifName} port is up`);
                }
                delete timers.current[key];
              }, 5000); // 5 seconds delay for UP
            }
          }

          lastStatus.current[key] = currentStatus;
        });
      });
    };

    socket.on("traffic", handleTraffic);

    return () => {
      socket.off("traffic", handleTraffic);
      // Clear all pending timers on unmount
      Object.values(timers.current).forEach(clearTimeout);
      timers.current = {};
    };
  }, [interfaces, selected, statuses]);

  /* ================= REMOVE PORT ================= */
  const removePort = (key) => {
    const updated = selected.filter((x) => x !== key);
    setSelected(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

    // Clear timer and status for removed port
    if (timers.current[key]) {
      clearTimeout(timers.current[key]);
      delete timers.current[key];
    }
    delete lastStatus.current[key];
  };

  /* ================= CHECKBOX HANDLER ================= */
  const toggleSelect = (iface) => {
    const key = `${iface.device_id}_${iface.ifIndex}`;
    if (selected.includes(key)) return; // Prevent re-adding

    const updated = [...selected, key];
    setSelected(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

    // Set initial lastStatus for new selection
    lastStatus.current[key] = statuses[iface.device_id]?.[iface.ifIndex] === 1 ? "UP" : "DOWN";
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
        <div style={{ background: "#fff", border: "1px solid #ccc", marginTop: 4 }}>
          {interfaces
            .filter((i) =>
              `${i.device_name} ${i.ifName} ${i.ifDescr}`
                .toLowerCase()
                .includes(search.toLowerCase())
            )
            .map((i) => {
              const key = `${i.device_id}_${i.ifIndex}`;
              const currentStatus = statuses[i.device_id]?.[i.ifIndex];
              const isUp = currentStatus === 1;

              return (
                <label
                  key={key}
                  style={{ display: "flex", padding: 6, cursor: "pointer" }}
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(key)}
                    onChange={() => toggleSelect(i)}
                  />
                  <span style={{ marginLeft: 8 }}>
                    <b>{i.device_name}</b> | {i.ifDescr}
                  </span>
                  <span
                    style={{
                      fontWeight: "bold",
                      color: isUp ? "green" : "red",
                      marginLeft: "auto",
                    }}
                  >
                    {isUp ? "UP" : "DOWN"}
                  </span>
                </label>
              );
            })}
        </div>
      )}

      {/* ================= SELECTED PORTS ================= */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))",
          gap: 16,
          marginTop: 20,
        }}
      >
        {selected.map((key) => {
          const [devId, ifIndex] = key.split("_");
          const iface = interfaces.find(
            (x) => x.device_id == devId && x.ifIndex == ifIndex
          );
          const cur = traffic?.[devId]?.[ifIndex] || { rx: 0, tx: 0 };
          const currentStatus = statuses[devId]?.[ifIndex];
          const isUp = currentStatus === 1;

          return (
            <div
              key={key}
              style={{
                background: "#fff",
                padding: 14,
                borderRadius: 6,
                boxShadow: "0 1px 4px rgba(0,0,0,.15)",
                position: "relative",
              }}
            >
              {/* ➖ Remove Button */}
              <button
                onClick={() => removePort(key)}
                style={{
                  position: "absolute",
                  top: 6,
                  right: 6,
                  border: "none",
                  background: isUp ? "green" : "red",
                  color: "#fff",
                  borderRadius: "50%",
                  width: 24,
                  height: 24,
                  cursor: "pointer",
                }}
              >
                −
              </button>

              <b>{iface?.device_name}</b>
              <div>{iface?.ifName}</div>

              <div
                style={{
                  fontWeight: "bold",
                  color: isUp ? "green" : "red",
                }}
              >
                {isUp ? "UP" : "DOWN"}
              </div>

              <div style={{ fontWeight: "bold", marginTop: 6 }}>
                TX: {formatBps(cur.tx)} | RX: {formatBps(cur.rx)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}