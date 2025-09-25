import React from "react";
import { Link } from "react-router-dom";

const buttonStyle = {
  padding: "8px 12px",
  borderRadius: "4px",
  backgroundColor: "#011b58ff",
  color: "white",
  border: "none",
  cursor: "pointer",
};

export default function Service() {
  return (
    <div style={{ padding: "16px" }}>
      {/* Back to Home */}
      <Link to="/" style={{ textDecoration: "none" }}>
        <button
          style={{
            padding: "8px 12px",
            borderRadius: "4px",
            backgroundColor: "#090101ff",
            color: "white",
            border: "none",
            cursor: "pointer",
            marginBottom: "16px",
          }}
        >
          Back to Home
        </button>
      </Link>

      <h1 style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "24px" }}>
        SERVICES MAIN PAGE
      </h1>

 
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {/* Service A */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ width: "100px" }}>Service A:</span>
           <button style={buttonStyle}>EDIT</button>
          <button style={buttonStyle}>DELETE</button>
          <button style={buttonStyle}>VIEW</button>
        </div>

        {/* Service B */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ width: "100px" }}>Service B:</span>
           <button style={buttonStyle}>EDIT</button>
          <button style={buttonStyle}>DELETE</button>
          <button style={buttonStyle}>VIEW</button>
        </div>

        {/* Service C */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ width: "100px" }}>Service C:</span>
           <button style={buttonStyle}>EDIT</button>
          <button style={buttonStyle}>DELETE</button>
          <button style={buttonStyle}>VIEW</button>
        </div>
      </div>
    </div>
  );
}
