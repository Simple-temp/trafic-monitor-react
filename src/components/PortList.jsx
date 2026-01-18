import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { io } from "socket.io-client";
import downSoundFile from "../assets/inactive.wav";
import upSoundFile from "../assets/active.wav";
import { ToastContainer, toast } from 'react-toastify';

const socket = io("http://localhost:5000");

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
  const [notifications, setNotifications] = useState([]);
  const [upPorts, setUpPorts] = useState([]);
  const [downInList, setDownInList] = useState([]);
  const [animating, setAnimating] = useState({});
  const [searchQuery, setSearchQuery] = useState(""); // Added state for search query

  const lastStatus = useRef({});
  const timers = useRef({});
  const downAudio = useRef(null);
  const upAudio = useRef(null);

  useEffect(() => {
    axios.get("http://localhost:5000/api/devices").then((res) => {
      console.log(res.data);
      setInterfaces(res.data.interfaces);
      const initialStatuses = {};
      const initialUpPorts = [];
      res.data.interfaces.forEach((iface) => {
        if (!initialStatuses[iface.device_id])
          initialStatuses[iface.device_id] = {};
        initialStatuses[iface.device_id][iface.ifIndex] = iface.ifOperStatus;
        const key = `${iface.device_id}_${iface.ifIndex}`;
        lastStatus.current[key] = iface.ifOperStatus === 1 ? "UP" : "DOWN";
        if (iface.ifOperStatus === 1) {
          initialUpPorts.push(iface);
        }
      });
      initialUpPorts.sort((a, b) => a.ifIndex - b.ifIndex); // Sort UP ports by ifIndex
      setStatuses(initialStatuses);
      setUpPorts(initialUpPorts);
    });
  }, []);

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

      // Alarm logic for all interfaces - immediate audio, delayed toast for DOWN, immediate for UP
      Object.entries(data).forEach(([devId, ifs]) => {
        Object.entries(ifs).forEach(([ifIndex, v]) => {
          const key = `${devId}_${ifIndex}`;
          // Find the interface to get ifAlias (fixed type comparison and variable name)
          const iface = interfaces.find(
            (i) =>
              i.device_id === parseInt(devId) && i.ifIndex === parseInt(ifIndex)
          );
          const alias = iface && iface.ifAlias ? iface.ifAlias : key; // Fallback to key if ifAlias is not available

          const currentStatus = v.status === 1 ? "UP" : "DOWN";
          const prevStatus = lastStatus.current[key];

          if (prevStatus && prevStatus !== currentStatus) {
            if (currentStatus === "DOWN") {
              // Add to downInList at the top, remove from upPorts if present
              setDownInList((prev) => [
                iface,
                ...prev.filter((i) => `${i.device_id}_${i.ifIndex}` !== key),
              ]);
              setUpPorts((prev) =>
                prev.filter((i) => `${i.device_id}_${i.ifIndex}` !== key)
              );
              setAnimating((prev) => ({ ...prev, [key]: "down" }));
              setTimeout(
                () => setAnimating((prev) => ({ ...prev, [key]: null })),
                1000
              );

              // Play DOWN audio immediately
              playAudio(downAudio);
              speak(`Alert! ${alias} is down`);

              // Schedule toast after 10s
              if (!timers.current[key]) {
                timers.current[key] = setTimeout(() => {
                  // showToast(`⚠️ ${alias} is DOWN`, "danger");
                  toast.error(`✅ ${alias} is DOWN`)
                  delete timers.current[key];
                }, 10000); // Fixed to 10s delay
              }
            } else if (currentStatus === "UP") {
              // Remove from downInList, add to upPorts in sorted position
              setDownInList((prev) =>
                prev.filter((i) => `${i.device_id}_${i.ifIndex}` !== key)
              );
              setUpPorts((prev) => {
                const newUp = [
                  ...prev.filter((i) => `${i.device_id}_${i.ifIndex}` !== key),
                  iface,
                ];
                newUp.sort((a, b) => a.ifIndex - b.ifIndex);
                return newUp;
              });
              setAnimating((prev) => ({ ...prev, [key]: "up" }));
              setTimeout(
                () => setAnimating((prev) => ({ ...prev, [key]: null })),
                1000
              );

              // Clear any pending DOWN toast
              if (timers.current[key]) {
                clearTimeout(timers.current[key]);
                delete timers.current[key];
              }

              // Play UP audio immediately
              playAudio(upAudio);
              speak(`${alias} is up`);

              // Show UP toast immediately
              // showToast(`✅ ${alias} is back UP`, "success");
              toast.success(`✅ ${alias} is back UP`)
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
  }, [interfaces, statuses]);

  // Audio control function (added debug logs)
  const playAudio = (audioRef) => {
    if (!audioRef.current) {
      console.log("Audio ref not ready");
      return;
    }
    console.log("Playing audio:", audioRef.current.src);
    audioRef.current.pause();
    audioRef.current.currentTime = 0;
    audioRef.current.play().catch((err) => {
      console.error("Audio play failed:", err);
    });
  };

  // Toast notification function
  const showToast = (message, type) => {
    const id = Date.now();
    setNotifications((p) => [...p, { id, message, type }]);
    setTimeout(() => {
      setNotifications((p) => p.filter((n) => n.id !== id));
    }, 5000);
  };

  // Combined list: downInList (DOWN ports at top) + upPorts (UP ports sorted)
  const displayedPorts = [...downInList, ...upPorts];

  // Filter ports based on search query (case-insensitive search on device_name, ifDescr, ifAlias)
  const filteredPorts = displayedPorts.filter((i) => {
    const query = searchQuery.toLowerCase();
    return (
      i.device_name.toLowerCase().includes(query) ||
      i.ifDescr.toLowerCase().includes(query) ||
      (i.ifAlias && i.ifAlias.toLowerCase().includes(query))
    );
  });

  return (
    <div
      style={{
        height: "100vh",
        width: "100vw",
        padding: "20px",
        overflowY: "auto",
      }}
    >
      <h2>Ports</h2>
       <ToastContainer position="top-right"/>
      {/* Search Bar */}
      <input
        type="text"
        placeholder="Search by device name, description, alias..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        style={{
          marginBottom: "20px",
          padding: "8px",
          width: "100%",
          border: "1px solid #ccc",
          borderRadius: "4px",
          fontSize: "16px",
        }}
      />
      {filteredPorts.map((i) => {
        const key = `${i.device_id}_${i.ifIndex}`;
        const currentStatus =
          statuses[i.device_id]?.[i.ifIndex] === 1 ? "UP" : "DOWN";
        const isAnimating = animating[key];
        return (
          <div
            key={key}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 16px",
              border: "1px solid #e0e0e0",
              borderRadius: "8px",
              backgroundColor: currentStatus === "UP" ? "#f0f8f0" : "#fff5f5",
              marginBottom: "8px",
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
              animation: isAnimating
                ? isAnimating === "up"
                  ? "jumpUp 1s ease-out"
                  : "jumpDown 1s ease-out"
                : "none",
            }}
          >
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                gap: "4px",
              }}
            >
              <div
                style={{ fontWeight: "bold", fontSize: "16px", color: "#333", display:"flex" }}
              >
                {i.device_name} : 
                              <div style={{ fontSize: "14px", color: "#666", display:"flex", marginLeft:5 }}>
                {i.ifDescr}
                <div style={{ fontSize: "14px", color: "#666", marginLeft:5 }}>
                  {i.ifAlias}
                </div>
              </div>
              </div>
            </div>
            <div
              style={{
                fontSize: "12px",
                fontWeight: "bold",
                padding: "4px 8px",
                borderRadius: "4px",
                backgroundColor: currentStatus === "UP" ? "#e8f5e8" : "#ffebee",
                color: currentStatus === "UP" ? "#4CAF50" : "#F44336",
              }}
            >
              Status: {currentStatus}
            </div>
          </div>
        );
      })}

      {/* TOASTS */}
      <div
        style={{
          position: "fixed",
          top: "20px",
          right: "20px",
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          zIndex: 9999,
        }}
      >
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
              background:
                n.type === "danger"
                  ? "linear-gradient(135deg, #dc2626, #b91c1c)"
                  : "linear-gradient(135deg, #16a34a, #15803d)",
              animation: "slideInRight 0.5s ease-out",
            }}
          >
            {n.message}
          </div>
        ))}
      </div>

      {/* AUDIO */}
      <audio ref={downAudio} src={downSoundFile} preload="auto" />
      <audio ref={upAudio} src={upSoundFile} preload="auto" />

      <style>
        {`
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
          @keyframes jumpUp {
            0% { transform: translateY(20px); opacity: 0; }
            50% { transform: translateY(-10px); opacity: 1; }
            100% { transform: translateY(0); opacity: 1; }
          }
          @keyframes jumpDown {
            0% { transform: translateY(-20px); opacity: 0; }
            50% { transform: translateY(10px); opacity: 1; }
            100% { transform: translateY(0); opacity: 1; }
          }
        `}
      </style>
    </div>
  );
}