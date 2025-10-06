import React from "react";
import { Link } from "react-router-dom";

export default function EditR() {
  return (
    <div style={{ padding: "16px" }}>
      <Link to="/resident" style={{ textDecoration: "none" }}>
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
          Back to Residents
        </button>
      </Link>

      <h2>Edit Resident</h2>
      <p>This is a placeholder page for editing resident info.</p>
    </div>
  );
}
