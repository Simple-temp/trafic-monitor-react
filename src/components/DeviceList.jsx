import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import downSoundFile from "../assets/down.mp3";
import upSoundFile from "../assets/up.mp3";

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
        showToast(`⚠️ ${device.hostname} is DOWN`, "danger");
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
    showToast(`✅ ${device.hostname} is back UP`, "success");
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
      <header style={styles.header}>
        <h1 style={styles.title}>📡 Network Device Monitoring Dashboard</h1>
        <p style={styles.subtitle}>Real-time status tracking with alerts</p>
      </header>

      {!monitoring && (
        <div style={styles.startSection}>
          <button style={styles.startBtn} onClick={() => setMonitoring(true)}>
            ▶ Start Monitoring & Enable Alerts
          </button>
          <p style={styles.startNote}>
            Click to begin monitoring devices. You'll receive audio and visual alerts for status changes.
          </p>
        </div>
      )}

      {monitoring && (
        <div style={styles.monitoringIndicator}>
          <span style={styles.indicatorDot}></span>
          Monitoring Active
        </div>
      )}

      <div style={styles.grid}>
        {devices.map((d) => (
          <div
            key={d.id}
            style={{
              ...styles.card,
              background: d.status === "UP" ? "linear-gradient(135deg, #ecfdf5, #d1fae5)" : "linear-gradient(135deg, #fee2e2, #fecaca)",
              borderColor: d.status === "UP" ? "#10b981" : "#ef4444",
              boxShadow: d.status === "UP" ? "0 4px 12px rgba(16, 185, 129, 0.2)" : "0 4px 12px rgba(239, 68, 68, 0.2)",
            }}
          >
            <div style={styles.deviceName}>{d.hostname}</div>
            <div
              style={{
                ...styles.status,
                color: d.status === "UP" ? "#059669" : "#dc2626",
              }}
            >
              {d.status}
            </div>
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
              background: n.type === "danger" ? "linear-gradient(135deg, #dc2626, #b91c1c)" : "linear-gradient(135deg, #16a34a, #15803d)",
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
    </div>
  );
};

/* -------------------- STYLES -------------------- */
const styles = {
  container: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #f8fafc, #e2e8f0)",
    fontFamily: "'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    padding: "20px",
    color: "#1f2937",
  },
  header: {
    textAlign: "center",
    marginBottom: "30px",
  },
  title: {
    fontSize: "2.5rem",
    fontWeight: "700",
    margin: "0 0 10px 0",
    color: "#1e293b",
  },
  subtitle: {
    fontSize: "1.1rem",
    color: "#64748b",
    margin: "0",
  },
  startSection: {
    textAlign: "center",
    marginBottom: "40px",
  },
  startBtn: {
    padding: "14px 28px",
    marginBottom: "15px",
    background: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "1rem",
    fontWeight: "600",
    boxShadow: "0 4px 12px rgba(59, 130, 246, 0.3)",
    transition: "all 0.3s ease",
  },
  startNote: {
    fontSize: "0.95rem",
    color: "#64748b",
    maxWidth: "400px",
    margin: "0 auto",
  },
  monitoringIndicator: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: "20px",
    fontSize: "1rem",
    fontWeight: "500",
    color: "#059669",
  },
  indicatorDot: {
    width: "10px",
    height: "10px",
    background: "#10b981",
    borderRadius: "50%",
    marginRight: "8px",
    animation: "pulse 2s infinite",
  },
  grid: {
    display: "flex",
    flexWrap: "wrap",
    gap: "20px",
    marginBottom: "40px",
    justifyContent: "center",
  },
  card: {
    width: "250px",
    height: "100px",
    borderRadius: "12px",
    border: "2px solid",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    textAlign: "center",
    transition: "all 0.3s ease",
    cursor: "pointer",
    padding: "10px",
  },
  deviceName: {
    fontSize: "1.1rem",
    fontWeight: "600",
    marginBottom: "8px",
    color: "#1e293b",
  },
  status: {
    fontWeight: "700",
    fontSize: "1rem",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  toastWrap: {
    position: "fixed",
    top: "20px",
    right: "20px",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    zIndex: 9999,
  },
  toast: {
    padding: "14px 18px",
    borderRadius: "8px",
    color: "#fff",
    fontWeight: "600",
    boxShadow: "0 6px 16px rgba(0,0,0,0.2)",
    minWidth: "300px",
  },
};

// Add CSS animations (you can add this to your global CSS or use a library like styled-components)
const globalStyles = `
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

  @keyframes pulse {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
  }
`;

// Inject global styles (in a real app, use a CSS file or styled-components)
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement("style");
  styleSheet.type = "text/css";
  styleSheet.innerText = globalStyles;
  document.head.appendChild(styleSheet);
}

export default DeviceList;