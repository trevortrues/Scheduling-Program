import React from "react";
import { Link } from "react-router-dom";

export default function EditS() {
  return (
    <div style={{ padding: "16px" }}>
      <Link to="/service" style={{ textDecoration: "none" }}>
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
          Back to Services
        </button>
      </Link>

      <h2>Edit Service</h2>
      <p>This is a placeholder page for editing service info.</p>
    </div>
  );
}
