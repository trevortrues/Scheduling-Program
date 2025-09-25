import React from "react";
import { Link } from "react-router-dom";

const buttonStyle = {
  padding: "6px 10px",
  borderRadius: "4px",
  backgroundColor: "#011b58ff",
  color: "white",
  border: "none",
  cursor: "pointer",
};

const button1Style = {
  padding: "6px 10px",
  borderRadius: "4px",
  backgroundColor: "#015258ff",
  color: "white",
  border: "none",
  cursor: "pointer",
};

export default function History() {
  // not real data 
  const historyRows = [
    "2025-09-20",
    "2025-09-21",
    "2025-09-22",
  ];

  return (
    <div style={{ padding: "16px" }}>
      {/* Back Butt */}
      <Link to="/schedule" style={{ textDecoration: "none" }}>
        <button
          style={{ ...buttonStyle, marginBottom: "16px" }}
        >
          Back
        </button>
      </Link>

      <h2 style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "16px" }}>
        Schedule History
      </h2>

      {/* History Rows */}
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {historyRows.map((date, idx) => (
          <div key={idx} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ minWidth: "120px" }}>{date} gen </span>
            {/* these need to be linked */}
            <button style={button1Style}>View Service Page</button>
            <button style={button1Style}>View Resident Page</button>
            <button style={button1Style}>View Full Schedule</button>
          </div>
        ))}
      </div>
    </div>
  );
}
