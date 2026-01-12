// import React, { useEffect, useState } from "react";
// import axios from "axios";
// import { io } from "socket.io-client";
// import { Line } from "react-chartjs-2";
// import {
//   Chart as ChartJS,
//   LineElement,
//   PointElement,
//   LinearScale,
//   CategoryScale,
//   Legend,
//   Tooltip,
//   Filler,
// } from "chart.js";

// ChartJS.register(
//   LineElement,
//   PointElement,
//   LinearScale,
//   CategoryScale,
//   Legend,
//   Tooltip,
//   Filler
// );

// const socket = io("http://localhost:5000");
// const STORAGE_KEY = "selectedInterfaces";

// /* ================= UTILS ================= */
// const formatSpeed = (bps) => {
//   const mbps = bps / 1e6;
//   if (mbps >= 1000) return `${(mbps / 1000).toFixed(2)} Gbps`;
//   return `${mbps.toFixed(2)} Mbps`;
// };

// export default function LiveGraph() {
//   const [interfaces, setInterfaces] = useState([]);
//   const [traffic, setTraffic] = useState({});
//   const [history, setHistory] = useState({});
//   const [search, setSearch] = useState("");
//   const [show, setShow] = useState(false);
//   const [selected, setSelected] = useState(
//     JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]")
//   );

//   /* ================= LOAD DATA ================= */
//   useEffect(() => {
//     axios.get("http://localhost:5000/api/devices").then((res) => {
//       setInterfaces(res.data.interfaces);
//     });

//     socket.on("traffic", (data) => {
//       setTraffic(data);
//       setHistory((prev) => {
//         const next = { ...prev };

//         Object.entries(data).forEach(([devId, ifs]) => {
//           Object.entries(ifs).forEach(([ifIndex, v]) => {
//             const key = `${devId}_${ifIndex}`;
//             if (!next[key]) next[key] = { rx: [], tx: [] };

//             next[key].rx.push(v.rx / 1e6);
//             next[key].tx.push(v.tx / 1e6);

//             if (next[key].rx.length > 30) next[key].rx.shift();
//             if (next[key].tx.length > 30) next[key].tx.shift();
//           });
//         });
//         return next;
//       });
//     });

//     return () => socket.off("traffic");
//   }, []);

//   /* ================= ACTIONS ================= */
//   const saveSelection = () => {
//     localStorage.setItem(STORAGE_KEY, JSON.stringify(selected));
//     setShow(false);
//   };

//   const remove = (key) => {
//     const updated = selected.filter((x) => x !== key);
//     setSelected(updated);
//     localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
//   };

//   /* ================= UI ================= */
//   return (
//     <div style={{ padding: 20 }}>
//       <input
//         placeholder="Search device / interface"
//         value={search}
//         onFocus={() => setShow(true)}
//         onChange={(e) => setSearch(e.target.value)}
//         style={{
//           width: "100%",
//           padding: 12,
//           fontSize: 14,
//           marginBottom: 5,
//         }}
//       />

//       {show && (
//         <div
//           style={{
//             background: "#fff",
//             border: "1px solid #ccc",
//             padding: 10,
//             maxHeight: 260,
//             overflow: "auto",
//           }}
//         >
//           {interfaces
//             .filter((i) =>
//               `${i.device_name} ${i.ifName} ${i.ifDescr}`
//                 .toLowerCase()
//                 .includes(search.toLowerCase())
//             )
//             .map((i) => {
//               const key = `${i.device_id}_${i.ifIndex}`;
//               return (
//                 <label
//                   key={key}
//                   style={{
//                     display: "flex",
//                     alignItems: "center",
//                     gap: 8,
//                     padding: "4px 0",
//                   }}
//                 >
//                   <input
//                     type="checkbox"
//                     checked={selected.includes(key)}
//                     onChange={(e) =>
//                       e.target.checked
//                         ? setSelected([...selected, key])
//                         : setSelected(selected.filter((x) => x !== key))
//                     }
//                   />
//                   <span style={{ flex: 1 }}>
//                     <b>{i.device_name}</b> | {i.ifName} | {i.ifDescr}
//                   </span>
//                   <span
//                     style={{
//                       color: i.ifOperStatus === 1 ? "green" : "red",
//                       fontWeight: 600,
//                     }}
//                   >
//                     {i.ifOperStatus === 1 ? "UP" : "DOWN"}
//                   </span>
//                 </label>
//               );
//             })}
//           <button onClick={saveSelection} style={{ marginTop: 8 }}>
//             Add Selected
//           </button>
//         </div>
//       )}

//       <div
//         style={{
//           display: "grid",
//           gridTemplateColumns: "repeat(auto-fill,minmax(360px,1fr))",
//           gap: 20,
//           marginTop: 20,
//         }}
//       >
//         {selected.map((key) => {
//           const [devId, ifIndex] = key.split("_");
//           const iface = interfaces.find(
//             (x) => x.device_id == devId && x.ifIndex == ifIndex
//           );

//           const h = history[key] || { rx: [], tx: [] };
//           const cur = traffic[devId]?.[ifIndex] || { rx: 0, tx: 0 };

//           return (
//             <div
//               key={key}
//               style={{
//                 background: "#fff",
//                 borderRadius: 6,
//                 padding: 15,
//                 boxShadow: "0 1px 4px rgba(0,0,0,.1)",
//               }}
//             >
//               <button
//                 onClick={() => remove(key)}
//                 style={{ float: "right" }}
//               >
//                 ✕
//               </button>

//               <div style={{ marginBottom: 5 }}>
//                 <b>{iface?.device_name}</b>
//               </div>
//               <div>{iface?.ifName}</div>
//               <div style={{ fontSize: 13, color: "#666" }}>
//                 {iface?.ifDescr}
//               </div>

//               <div
//                 style={{
//                   margin: "6px 0",
//                   fontWeight: 600,
//                   color: iface?.ifOperStatus === 1 ? "green" : "red",
//                 }}
//               >
//                 {iface?.ifOperStatus === 1 ? "UP" : "DOWN"}
//               </div>

//               <div style={{ marginBottom: 6 }}>
//                 TX: {formatSpeed(cur.tx)} | RX: {formatSpeed(cur.rx)}
//               </div>

//               <Line
//                 height={300}
//                 data={{
//                   labels: h.rx.map((_, i) => i + 1),
//                   datasets: [
//                     {
//                       label: "RX (Mbps)",
//                       data: h.rx,
//                       fill: true,
//                       borderWidth: 1,
//                       backgroundColor: "rgba(33,150,243,.4)",
//                     },
//                     {
//                       label: "TX (Mbps)",
//                       data: h.tx,
//                       fill: true,
//                       borderWidth: 1,
//                       backgroundColor: "rgba(244,67,54,.4)",
//                     },
//                   ],
//                 }}
//                 options={{
//                   responsive: true,
//                   maintainAspectRatio: false,
//                   plugins: {
//                     legend: { position: "bottom" },
//                   },
//                 }}
//               />
//             </div>
//           );
//         })}
//       </div>
//     </div>
//   );
// }

import React, { useEffect, useState } from "react";
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

export default function LiveGraph() {
  const [interfaces, setInterfaces] = useState([]);
  const [traffic, setTraffic] = useState({});
  const [history, setHistory] = useState({});
  const [search, setSearch] = useState("");
  const [show, setShow] = useState(false);
  const [selected, setSelected] = useState(
    JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]")
  );

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

            /* GRAPH USES Mbps ONLY */
            next[key].rx.push(v.rx / 1_000_000);
            next[key].tx.push(v.tx / 1_000_000);

            if (next[key].rx.length > 30) next[key].rx.shift();
            if (next[key].tx.length > 30) next[key].tx.shift();
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
                    <b>{i.device_name}</b> | {i.ifName} | {i.ifDescr}
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

              {/* LIVE COUNTERS */}
              <div style={{ margin: "6px 0", fontWeight: "bold" }}>
                TX: {formatBps(cur.tx)} | RX: {formatBps(cur.rx)}
              </div>

              {/* GRAPH */}
              <div style={{ height: 280 }}>
                <Line
                  data={{
                    labels: h.rx.map((_, i) => i + 1),
                    datasets: [
                      {
                        label: "RX (Mbps)",
                        data: h.rx,
                        fill: true,
                        backgroundColor: "rgba(33,150,243,.45)",
                      },
                      {
                        label: "TX (Mbps)",
                        data: h.tx,
                        fill: true,
                        backgroundColor: "rgba(244,67,54,.45)",
                      },
                    ],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
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
