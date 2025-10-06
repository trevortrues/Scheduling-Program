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

export default function ResidentPage() {
  return (
    <div style={{ padding: "16px" }}>
      {/* Back to Home Button */}
      <Link to="/" style={{ textDecoration: "none" }}>
        <button
            style={{
            padding: "8px 12px",
            borderRadius: "4px",
            backgroundColor: "#375497ff",
            color: "white",
            border: "none",
            cursor: "pointer",
            marginBottom: "16px",
          }}
        >
          Back to Home
        </button>
      </Link>

      <div style={{ marginBottom: "16px" }}>
        <h2 style={{ fontSize: "24px", fontWeight: "bold", margin: 0 }}>
          RESIDENT MAIN PAGE
        </h2>

        <Link to="/addr" style={{ textDecoration: "none" }}><button style={buttonStyle}>ADD</button></Link>

      </div>


          {/* May come back in a change the colors of each button */}
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {/* Resident 1 */}
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <span>Resident 1:</span>
          <Link to="/editres" style={{ textDecoration: "none" }}><button style={buttonStyle}>EDIT</button></Link>
          <button style={buttonStyle}>DELETE</button>
          <button style={buttonStyle}>VIEW</button>
        </div>

        {/* Resident 2 */}
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <span>Resident 2:</span>
          <Link to="/editres" style={{ textDecoration: "none" }}><button style={buttonStyle}>EDIT</button></Link>
          <button style={buttonStyle}>DELETE</button>
          <button style={buttonStyle}>VIEW</button>
        </div>

        {/* Resident 3 */}
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <span>Resident 3:</span>
          <Link to="/editres" style={{ textDecoration: "none" }}><button style={buttonStyle}>EDIT</button></Link>
          <button style={buttonStyle}>DELETE</button>
          <button style={buttonStyle}>VIEW</button>
        </div>
      </div>
    </div>
  );
}
