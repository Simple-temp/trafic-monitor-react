import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { io } from "socket.io-client";
import downSoundFile from "../assets/baby.mp3";
import upSoundFile from "../assets/babyl.mp3";

const socket = io("http://localhost:5000");
const STORAGE_KEY = "selectedports";

function speak(text) {
  if (!window.speechSynthesis) return;
  const msg = new SpeechSynthesisUtterance(text);
  msg.rate = 0.95;
  msg.pitch = 1;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(msg);
}

export default function PortList() {
  const [interfaces, setInterfaces] = useState([]);
  const [statuses, setStatuses] = useState({});
  const [search, setSearch] = useState("");
  const [popupSearch, setPopupSearch] = useState("");
  const [show, setShow] = useState(false);
  const [selected, setSelected] = useState(
    JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]")
  );
  const [popupSelected, setPopupSelected] = useState([]);
  const [blinking, setBlinking] = useState({});

  const lastStatus = useRef({});
  const timers = useRef({});

  useEffect(() => {
    axios.get("http://localhost:5000/api/devices").then((res) => {
      setInterfaces(res.data.interfaces);
      const initialStatuses = {};
      res.data.interfaces.forEach(iface => {
        if (!initialStatuses[iface.device_id]) initialStatuses[iface.device_id] = {};
        initialStatuses[iface.device_id][iface.ifIndex] = iface.ifOperStatus;
      });
      setStatuses(initialStatuses);

      // Initialize lastStatus for selected ports to enable alarms on changes
      selected.forEach(key => {
        const [devId, ifIndex] = key.split("_");
        lastStatus.current[key] = initialStatuses[devId]?.[ifIndex] === 1 ? "UP" : "DOWN";
      });
    });
  }, [selected]); // Depend on selected to re-init if changed

  useEffect(() => {
    const handleTraffic = (data) => {
      const newStatuses = { ...statuses };
      let hasChanges = false;
      Object.entries(data).forEach(([devId, ifs]) => {
        if (!newStatuses[devId]) newStatuses[devId] = {};
        Object.entries(ifs).forEach(([ifIndex, v]) => {
          if (v.status !== undefined && newStatuses[devId][ifIndex] !== v.status) {
            newStatuses[devId][ifIndex] = v.status;
            hasChanges = true;
          }
        });
      });
      if (hasChanges) setStatuses({ ...newStatuses });

      // Alarm logic
      Object.entries(data).forEach(([devId, ifs]) => {
        Object.entries(ifs).forEach(([ifIndex, v]) => {
          const key = `${devId}_${ifIndex}`;
          if (!selected.includes(key)) return;

          const currentStatus = v.status === 1 ? "UP" : "DOWN";
          const prevStatus = lastStatus.current[key];

          console.log(`Alarm check for ${key}: prev=${prevStatus}, current=${currentStatus}`);

          if (prevStatus && prevStatus !== currentStatus) {
            if (timers.current[key]) clearTimeout(timers.current[key]);
            if (currentStatus === "DOWN") {
              timers.current[key] = setTimeout(() => {
                console.log("Triggering DOWN alarm for", key);
                const iface = interfaces.find(i => i.device_id == devId && i.ifIndex == ifIndex);
                if (iface) {
                  speak(`Alert! ${iface.device_name} ${iface.ifName} port is down`);
                  const downSound = new Audio(downSoundFile);
                  downSound.onerror = () => console.log("Sound load error for down");
                  downSound.play().catch(e => console.log("Play error for down", e));
                }
                delete timers.current[key];
              }, 5000);
            } else if (currentStatus === "UP") {
              timers.current[key] = setTimeout(() => {
                console.log("Triggering UP alarm for", key);
                const iface = interfaces.find(i => i.device_id == devId && i.ifIndex == ifIndex);
                if (iface) {
                  speak(`${iface.device_name} ${iface.ifName} port is up`);
                  const upSound = new Audio(upSoundFile);
                  upSound.onerror = () => console.log("Sound load error for up");
                  upSound.play().catch(e => console.log("Play error for up", e));
                }
                delete timers.current[key];
              }, 5000);
            }
          }
          lastStatus.current[key] = currentStatus;
        });
      });
    };

    socket.on("traffic", handleTraffic);
    return () => {
      socket.off("traffic", handleTraffic);
      Object.values(timers.current).forEach(clearTimeout);
      timers.current = {};
    };
  }, [interfaces, selected, statuses]);

  const removePort = (key) => {
    const updated = selected.filter((x) => x !== key);
    setSelected(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    if (timers.current[key]) clearTimeout(timers.current[key]);
    delete lastStatus.current[key];
    setBlinking({ ...blinking, [key]: false });
  };

  const togglePopupSelect = (key) => {
    setPopupSelected((prev) =>
      prev.includes(key) ? prev.filter((x) => x !== key) : [...prev, key]
    );
  };

  const addSelected = () => {
    const newSelected = [...selected];
    const newBlinking = { ...blinking };
    popupSelected.forEach((key) => {
      if (!newSelected.includes(key)) {
        newSelected.push(key);
        newBlinking[key] = true;
        setTimeout(() => setBlinking((prev) => ({ ...prev, [key]: false })), 5000);
        // Initialize lastStatus for new selection
        const [devId, ifIndex] = key.split("_");
        lastStatus.current[key] = statuses[devId]?.[ifIndex] === 1 ? "UP" : "DOWN";
      }
    });
    setSelected(newSelected);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newSelected));
    setBlinking(newBlinking);
    setPopupSelected([]);
    setShow(false);
  };

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
          onClick={() => setShow(false)}
        >
          <div
            style={{
              background: "#fff",
              border: "1px solid #ccc",
              padding: "20px",
              width: "1000px",
              height: "600px",
              overflowY: "auto",
              boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
              position: "relative",
            }}
            onClick={(e) => e.stopPropagation()}
          >
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
              }}
            >
              ✕
            </button>
            <input
              placeholder="Search device / interface"
              value={popupSearch}
              onChange={(e) => setPopupSearch(e.target.value)}
              style={{ width: "100%", padding: "10px", marginBottom: "10px" }}
            />
            {interfaces
              .filter((i) =>
                `${i.device_name} ${i.ifName} ${i.ifDescr}`
                  .toLowerCase()
                  .includes(popupSearch.toLowerCase())
              )
              .map((i) => {
                const key = `${i.device_id}_${i.ifIndex}`;
                const currentStatus = statuses[i.device_id]?.[i.ifIndex];
                const isUp = currentStatus === 1;
                return (
                  <div
                    key={key}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "10px",
                      borderBottom: "1px solid #eee",
                    }}
                  >
                    <label style={{ display: "flex", alignItems: "center", flex: 1 }}>
                      <input
                        type="checkbox"
                        checked={popupSelected.includes(key)}
                        onChange={() => togglePopupSelect(key)}
                        style={{ marginRight: "10px" }}
                      />
                      <div>
                        <div style={{ fontWeight: "bold" }}>{i.device_name}</div>
                        <div style={{ fontSize: "14px", color: "#666" }}>{i.ifName}</div>
                      </div>
                    </label>
                    <span
                      style={{
                        fontWeight: "bold",
                        color: isUp ? "green" : "red",
                      }}
                    >
                      {isUp ? "UP" : "DOWN"}
                    </span>
                  </div>
                );
              })}
            <button
              onClick={addSelected}
              style={{
                width: "100%",
                padding: "10px",
                backgroundColor: "#007bff",
                color: "#fff",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                marginTop: "10px",
              }}
            >
              Add Selected
            </button>
          </div>
        </div>
      )}

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
          const currentStatus = statuses[devId]?.[ifIndex];
          const isUp = currentStatus === 1;
          const isBlinking = blinking[key];

          return (
            <div
              key={key}
              style={{
                background: "#fff",
                padding: 14,
                borderRadius: 6,
                boxShadow: "0 1px 4px rgba(0,0,0,.15)",
                position: "relative",
                animation: isBlinking ? (isUp ? "blinkGreen 1s infinite" : "blinkRed 1s infinite") : "none",
              }}
            >
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
              <div style={{ fontWeight: "bold" }}>{iface?.ifName}</div>
              <div style={{ fontSize: "14px", color: "#666" }}>{iface?.ifDescr}</div>
              <div
                style={{
                  fontWeight: "bold",
                  color: isUp ? "green" : "red",
                  marginTop: 6,
                }}
              >
                {isUp ? "UP" : "DOWN"}
              </div>
            </div>
          );
        })}
      </div>

      <style>
        {`
          @keyframes blinkGreen {
            0% { background-color: #fff; }
            50% { background-color: #d4edda; }
            100% { background-color: #fff; }
          }
          @keyframes blinkRed {
            0% { background-color: #fff; }
            50% { background-color: #f8d7da; }
            100% { background-color: #fff; }
          }
        `}
      </style>
    </div>
  );
}