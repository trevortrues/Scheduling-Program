import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";

export default function DeletedResidents() {
  const [deletedResidents, setDeletedResidents] = useState([]);

  useEffect(() => {
    const fetchDeletedResidents = async () => {
      try {
        // false = get all, true = only active → we’ll filter manually
        const result = await window.api.getResidents(false);
        const deleted = result.filter((r) => r.is_active === 0);
        setDeletedResidents(deleted);
      } catch (err) {
        console.error("Failed to fetch deleted residents:", err);
      }
    };
    fetchDeletedResidents();
  }, []);

  return (
    <div style={{ padding: "16px" }}>
      {/* Back Button */}
      <Link to="/resident" style={{ textDecoration: "none" }}>
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
          Back to Resident Page
        </button>
      </Link>

      <h2 style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "16px" }}>
        Deleted Residents
      </h2>

      {deletedResidents.length === 0 ? (
        <p style={{ color: "#555" }}>No deleted residents.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {deletedResidents.map((resident) => (
            <div
              key={resident.res_id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                backgroundColor: "#f8f9fa",
                padding: "8px 12px",
                borderRadius: "6px",
                border: "1px solid #ccc",
              }}
            >
              <span style={{ color: "#666", textDecoration: "line-through" }}>
                {resident.first_name} {resident.last_name} (PGY {resident.pgy_level})
              </span>
              <span style={{ fontStyle: "italic", color: "#999" }}>Deleted</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
