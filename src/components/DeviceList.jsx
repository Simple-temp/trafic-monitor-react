import axios from "axios";
import React, { useEffect, useState } from "react";

const DeviceList = () => {
  const [devices, setDevices] = useState([]);

  useEffect(() => {
    let timer;

    async function fetchData() {
      try {
        const res = await axios.get("http://localhost:5000/api/devices");
        setDevices(res.data.devices);
      } catch (err) {
        console.error("API error", err);
      }
    }

    fetchData(); // initial load
    timer = setInterval(fetchData, 1000); // refresh every 1s

    return () => clearInterval(timer); // cleanup
  }, []);

  return (
    <div>
      <h2>Devices</h2>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 15 }}>
        {devices.map((d) => (
          <div
            key={d.id}
            style={{
              padding: 10,
              borderRadius: 8,
              border: "1px solid #ddd",
              minWidth: 200,
              textAlign: "center",
              backgroundColor: "#f5f5f5",
            }}
          >
            <b>{d.name}</b>
            <div
              style={{
                color: d.status === "UP" ? "green" : "red",
                fontWeight: "bold",
                marginTop: 6,
              }}
            >
              {d.status}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DeviceList;
