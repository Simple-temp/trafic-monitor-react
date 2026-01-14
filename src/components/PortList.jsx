import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { io } from "socket.io-client";
import downSoundFile from "../assets/inactive.wav";
import upSoundFile from "../assets/active.wav";

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
  const [notifications, setNotifications] = useState([]); // Added for toast notifications like DeviceList

  const lastStatus = useRef({});
  const timers = useRef({});
  const downAudio = useRef(null); // Added for audio refs like DeviceList
  const upAudio = useRef(null); // Added for audio refs like DeviceList

  useEffect(() => {
    axios.get("http://localhost:5000/api/devices").then((res) => {
      setInterfaces(res.data.interfaces);
      const initialStatuses = {};
      res.data.interfaces.forEach((iface) => {
        if (!initialStatuses[iface.device_id])
          initialStatuses[iface.device_id] = {};
        initialStatuses[iface.device_id][iface.ifIndex] = iface.ifOperStatus;
      });
      setStatuses(initialStatuses);

      // Initialize lastStatus for selected ports to enable alarms on changes
      selected.forEach((key) => {
        const [devId, ifIndex] = key.split("_");
        lastStatus.current[key] =
          initialStatuses[devId]?.[ifIndex] === 1 ? "UP" : "DOWN";
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
          if (
            v.status !== undefined &&
            newStatuses[devId][ifIndex] !== v.status
          ) {
            newStatuses[devId][ifIndex] = v.status;
            hasChanges = true;
          }
        });
      });
      if (hasChanges) setStatuses({ ...newStatuses });

      // Alarm logic - Updated to match DeviceList style: immediate audio, delayed toast for DOWN, immediate for UP
      Object.entries(data).forEach(([devId, ifs]) => {
        Object.entries(ifs).forEach(([ifIndex, v]) => {
          const key = `${devId}_${ifIndex}`;
          if (!selected.includes(key)) return;

          const currentStatus = v.status === 1 ? "UP" : "DOWN";
          const prevStatus = lastStatus.current[key];

          console.log(
            `Alarm check for ${key}: prev=${prevStatus}, current=${currentStatus}`
          );

          if (prevStatus && prevStatus !== currentStatus) {
            if (currentStatus === "DOWN") {
              // Play DOWN audio immediately (like DeviceList)
              playAudio(downAudio);
              speak(`Alert! Port ${key} is down`); // Kept speech for consistency

              // Schedule toast after 10s (like DeviceList)
              if (!timers.current[key]) {
                timers.current[key] = setTimeout(() => {
                  showToast(`⚠️ Port ${key} is DOWN`, "danger");
                  delete timers.current[key];
                }, 10000); // 10s delay
              }
            } else if (currentStatus === "UP") {
              // Clear any pending DOWN toast
              if (timers.current[key]) {
                clearTimeout(timers.current[key]);
                delete timers.current[key];
              }

              // Play UP audio immediately (like DeviceList)
              playAudio(upAudio);
              speak(`Port ${key} is up`); // Kept speech for consistency

              // Show UP toast immediately (like DeviceList)
              showToast(`✅ Port ${key} is back UP`, "success");
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

  // Audio control function (copied from DeviceList)
  const playAudio = (audioRef) => {
    if (!audioRef.current) return;
    audioRef.current.pause();
    audioRef.current.currentTime = 0;
    audioRef.current.play().catch(() => {});
  };

  // Toast notification function (adapted from DeviceList)
  const showToast = (message, type) => {
    const id = Date.now();
    setNotifications((p) => [...p, { id, message, type }]);
    setTimeout(() => {
      setNotifications((p) => p.filter((n) => n.id !== id));
    }, 5000);
  };

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
        setTimeout(
          () => setBlinking((prev) => ({ ...prev, [key]: false })),
          5000
        );
        // Initialize lastStatus for new selection
        const [devId, ifIndex] = key.split("_");
        lastStatus.current[key] =
          statuses[devId]?.[ifIndex] === 1 ? "UP" : "DOWN";
      }
    });
    setSelected(newSelected);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newSelected));
    setBlinking(newBlinking);
    setPopupSelected([]);
    setShow(false);
  };

  // Filter selected ports for UP and DOWN
  const upPorts = selected.filter((key) => {
    const [devId, ifIndex] = key.split("_");
    return statuses[devId]?.[ifIndex] === 1;
  });
  const downPorts = selected.filter((key) => {
    const [devId, ifIndex] = key.split("_");
    return statuses[devId]?.[ifIndex] !== 1;
  });

  return (
    <div style={{ display: "flex", height: "100vh", width: "100vw" }}>
      {/* Left Side: 30% - UP ports */}
      <div
        style={{
          width: "30%",
          height: "100%",
          padding: "20px",
          borderRight: "1px solid #ccc",
          overflowY: "auto",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginBottom: "20px",
          }}
        >
          <input
            placeholder="Search device / interface"
            value={search}
            onFocus={() => setShow(true)}
            onChange={(e) => setSearch(e.target.value)}
            style={{ flex: 1, padding: "12px", marginRight: "10px" }}
          />
          <button
            onClick={() => setShow(true)}
            style={{
              padding: "12px",
              backgroundColor: "#007bff",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Add Port
          </button>
        </div>

        {/* List of UP selected ports */}
        <div>
          {upPorts.map((key) => {
            const [devId, ifIndex] = key.split("_");
            const iface = interfaces.find(
              (x) => x.device_id == devId && x.ifIndex == ifIndex
            );
            const isBlinking = blinking[key];

            return (
              <div
                key={key}
                style={{
                  background: "#fff",
                  padding: "14px",
                  borderRadius: "6px",
                  boxShadow: "0 1px 4px rgba(0,0,0,.15)",
                  marginBottom: "10px",
                  position: "relative",
                  animation: isBlinking ? "blinkGreen 1s infinite" : "none",
                }}
              >
                <button
                  onClick={() => removePort(key)}
                  style={{
                    position: "absolute",
                    top: "6px",
                    right: "6px",
                    border: "none",
                    background: "green",
                    color: "#fff",
                    borderRadius: "50%",
                    width: "24px",
                    height: "24px",
                    cursor: "pointer",
                  }}
                >
                  −
                </button>
                <div style={{ fontWeight: "bold" }}>{iface?.device_name}</div>  {/* Changed to device_name for consistency */}
                <div style={{ fontWeight: "bold" }}>{iface?.ifName}</div>
                {/* <div style={{ fontSize: "14px", color: "#666" }}>
                  {iface?.ifDescr}
                </div> */}
                <div
                  style={{
                    fontWeight: "bold",
                    color: "green",
                    marginTop: "6px",
                  }}
                >
                  UP
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {/* Right Side: 70% - DOWN ports */}
      <div
        style={{
          width: "70%",
          height: "100%",
          padding: "20px",
          position: "relative",
          overflowY: "auto",
        }}
      >
        {/* List of DOWN selected ports */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "10px",
          }}
        >
          {downPorts.map((key) => {
            const [devId, ifIndex] = key.split("_");
            const iface = interfaces.find(
              (x) => x.device_id == devId && x.ifIndex == ifIndex
            );
            const isBlinking = blinking[key];

            return (
              <div
                key={key}
                style={{
                  background: "#fff",
                  padding: "14px",
                  borderRadius: "6px",
                  boxShadow: "0 1px 4px rgba(0,0,0,.15)",
                  position: "relative",
                  animation: isBlinking ? "blinkRed 1s infinite" : "none",
                  width: "250px",
                  height: "100px",
                }}
              >
                <button
                  onClick={() => removePort(key)}
                  style={{
                    position: "absolute",
                    top: "6px",
                    right: "6px",
                    border: "none",
                    background: "red",
                    color: "#fff",
                    borderRadius: "50%",
                    width: "24px",
                    height: "24px",
                    cursor: "pointer",
                  }}
                >
                  −
                </button>
                <div style={{ fontWeight: "bold" }}>{iface?.device_name}</div>  {/* Changed to device_name for consistency */}
                <div style={{ fontWeight: "bold" }}>{iface?.ifName}</div>
                <div style={{ fontSize: "14px", color: "#666" }}>
                  {iface?.ifDescr}
                </div>
                <div
                  style={{
                    fontWeight: "bold",
                    color: "red",
                    marginTop: "6px",
                  }}
                >
                  DOWN
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {/* Popup for adding ports */}
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
              display: "flex",
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
            {/* Left side of popup: search and list */}
            <div style={{ flex: 1, paddingRight: "20px" }}>
              <input
                placeholder="Search device / interface"
                value={popupSearch}
                onChange={(e) => setPopupSearch(e.target.value)}
                style={{ width: "100%", padding: "10px", marginBottom: "10px" }}
              />
              <div style={{ overflowY: "auto", height: "500px" }}>
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
                        <label
                          style={{
                            display: "flex",
                            alignItems: "center",
                            flex: 1,
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={popupSelected.includes(key)}
                            onChange={() => togglePopupSelect(key)}
                            style={{ marginRight: "10px" }}
                          />
                          <div>
                            <div style={{ fontWeight: "bold" }}>
                              {i.device_name}
                            </div>
                            <div style={{ fontSize: "14px", color: "#666" }}>
                              {i.ifName}
                            </div>
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
              </div>
            </div>
            {/* Right side of popup: Add button */}
            <div
              style={{
                width: "200px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <button
                onClick={addSelected}
                style={{
                  width: "100%",
                  padding: "20px",
                  backgroundColor: "#007bff",
                  color: "#fff",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "16px",
                }}
              >
                Add Selected
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOASTS - Added like DeviceList */}
      <div style={{
        position: "fixed",
        top: "20px",
        right: "20px",
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        zIndex: 9999,
      }}>
        {notifications.map((n) => (
          <div
            key={n.id}
            style={{
              padding: "14px 18px",
              borderRadius: "8px",
              color: "#fff",
              fontWeight: "600",
              boxShadow: "0 6px 16px rgba(0,0,0,0.2)",
              minWidth: "300px",
              background: n.type === "danger" ? "linear-gradient(135deg, #dc2626, #b91c1c)" : "linear-gradient(135deg, #16a34a, #15803d)",
              animation: "slideInRight 0.5s ease-out",
            }}
          >
            {n.message}
          </div>
        ))}
      </div>

      {/* AUDIO - Added like DeviceList */}
      <audio ref={downAudio} src={downSoundFile} preload="auto" />
      <audio ref={upAudio} src={upSoundFile} preload="auto" />

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
          @keyframes slideInRight {
            from {
              transform: translateX(100%);
              opacity: 0;
            }
            to {
              transform: translateX(0);
              opacity: 1;
            }
          }
        `}
      </style>
    </div>
  );
}