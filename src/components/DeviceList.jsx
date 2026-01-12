import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import downSoundFile from "../assets/baby.mp3";
import upSoundFile from "../assets/babyl.mp3";

const API_URL = "http://localhost:5000/api/devices";
const POLL_INTERVAL = 1000;
const DOWN_NOTIFICATION_DELAY = 10000; // 10s

const DeviceList = () => {
  const [devices, setDevices] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [monitoring, setMonitoring] = useState(false);

  const prevStatusRef = useRef({});
  const downTimersRef = useRef({});
  const pollingRef = useRef(null);

  const downAudio = useRef(null);
  const upAudio = useRef(null);

  /* -------------------- START / STOP MONITORING -------------------- */
  useEffect(() => {
    if (!monitoring) return;

    fetchDevices();
    pollingRef.current = setInterval(fetchDevices, POLL_INTERVAL);

    return () => {
      clearInterval(pollingRef.current);
      clearAllDownTimers();
    };
  }, [monitoring]);

  /* -------------------- FETCH DEVICE DATA -------------------- */
  const fetchDevices = async () => {
    try {
      const res = await axios.get(API_URL);
      const list = res.data.devices || [];

      list.forEach((device) => {
        const prev = prevStatusRef.current[device.id];

        if (prev && prev !== device.status) {
          if (device.status !== "UP") {
            handleDeviceDown(device);
          } else {
            handleDeviceUp(device);
          }
        }

        prevStatusRef.current[device.id] = device.status;
      });

      setDevices(list);
    } catch (err) {
      console.error("Device API error:", err);
    }
  };

  /* -------------------- STATUS HANDLERS -------------------- */
  const handleDeviceDown = (device) => {
    // Play DOWN sound immediately
    playAudio(downAudio);

    // Schedule notification after 10s
    if (!downTimersRef.current[device.id]) {
      downTimersRef.current[device.id] = setTimeout(() => {
        showToast(`⚠️ ${device.name} is DOWN`, "danger");
        delete downTimersRef.current[device.id];
      }, DOWN_NOTIFICATION_DELAY);
    }
  };

  const handleDeviceUp = (device) => {
    // Clear any pending DOWN notification
    if (downTimersRef.current[device.id]) {
      clearTimeout(downTimersRef.current[device.id]);
      delete downTimersRef.current[device.id];
    }

    // Play UP sound immediately
    playAudio(upAudio);

    // Show UP notification
    showToast(`✅ ${device.name} is back UP`, "success");
  };

  /* -------------------- TOAST NOTIFICATION -------------------- */
  const showToast = (message, type) => {
    const id = Date.now();
    setNotifications((p) => [...p, { id, message, type }]);
    setTimeout(() => {
      setNotifications((p) => p.filter((n) => n.id !== id));
    }, 5000);
  };

  const clearAllDownTimers = () => {
    Object.values(downTimersRef.current).forEach(clearTimeout);
    downTimersRef.current = {};
  };

  /* -------------------- AUDIO CONTROL -------------------- */
  const playAudio = (audioRef) => {
    if (!audioRef.current) return;
    audioRef.current.pause();
    audioRef.current.currentTime = 0;
    audioRef.current.play().catch(() => {});
  };

  /* -------------------- UI -------------------- */
  return (
    <div style={styles.container}>
      <h2 style={styles.title}>📡 Device Monitoring</h2>

      {!monitoring && (
        <button style={styles.startBtn} onClick={() => setMonitoring(true)}>
          ▶ Start Monitoring & Enable Alerts
        </button>
      )}

      <div style={styles.grid}>
        {devices.map((d) => (
          <div
            key={d.id}
            style={{
              ...styles.card,
              background: d.status === "UP" ? "#ecfdf5" : "#fee2e2",
              borderColor: d.status === "UP" ? "#34d399" : "#f87171",
            }}
          >
            <h4>{d.name}</h4>
            <span
              style={{
                ...styles.status,
                color: d.status === "UP" ? "green" : "red",
              }}
            >
              {d.status}
            </span>
          </div>
        ))}
      </div>

      {/* TOASTS */}
      <div style={styles.toastWrap}>
        {notifications.map((n) => (
          <div
            key={n.id}
            style={{
              ...styles.toast,
              background: n.type === "danger" ? "#dc2626" : "#16a34a",
            }}
          >
            {n.message}
          </div>
        ))}
      </div>

      {/* AUDIO */}
      <audio ref={downAudio} src={downSoundFile} preload="auto" />
      <audio ref={upAudio} src={upSoundFile} preload="auto" />
    </div>
  );
};

/* -------------------- STYLES -------------------- */
const styles = {
  container: {
    padding: 20,
    fontFamily: "Segoe UI",
  },
  title: {
    marginBottom: 15,
  },
  startBtn: {
    padding: "10px 18px",
    marginBottom: 20,
    background: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
  },
  grid: {
    display: "flex",
    gap: 15,
    flexWrap: "wrap",
  },
  card: {
    minWidth: 220,
    padding: 15,
    borderRadius: 10,
    border: "2px solid",
    textAlign: "center",
    transition: "0.3s",
  },
  status: {
    fontWeight: "bold",
    fontSize: 18,
  },
  toastWrap: {
    position: "fixed",
    top: 20,
    right: 20,
    display: "flex",
    flexDirection: "column",
    gap: 10,
    zIndex: 9999,
  },
  toast: {
    padding: "12px 16px",
    borderRadius: 6,
    color: "#fff",
    fontWeight: "bold",
    boxShadow: "0 4px 8px rgba(0,0,0,0.2)",
  },
};

export default DeviceList;
