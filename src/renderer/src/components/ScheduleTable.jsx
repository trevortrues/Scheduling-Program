import { Link } from "react-router-dom";
import scheduleData from "./schedule.json";
import React, { useState, useEffect } from "react";

export default function ScheduleTable() {
  const [schedule, setSchedule] = useState({});
  const [showLegend, setShowLegend] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  useEffect(() => {
    setSchedule(scheduleData);
  }, []);

  const residentKeys = schedule ? Object.keys(schedule).filter((k) => k !== "weekly_counts") : [];
  const weeklyCounts = schedule?.weekly_counts || [];

  // Legend colors!!!
  const colorMap = {
    CC: "black",
    VAC: "red",
    Elective: "lightgray",
    stroke: "lightgreen",
    "B/U": "lightblue",
    wards: "yellow",
    VA: "purple",
  };

  return (
    <div style={{ overflow: "auto", padding: "16px", position: "relative" }}>
      {/* Grey overlay when edit mode is active */}
      {isEditMode && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            backgroundColor: "rgba(0, 0, 0, 0.15)",
            zIndex: 5,
          }}
        ></div>
      )}

      {/* Header */}
      <h1 className="text-2xl font-bold mb-2">Resident Schedule</h1>

      {/* Top Buttons */}
      <div
        style={{
          display: "flex",
          gap: "12px",
          marginBottom: "16px",
          alignItems: "center",
          position: "relative",
          zIndex: 10,
        }}
      >
        {/* Show Key */}
        <button
          onClick={() => setShowLegend(!showLegend)}
          style={{
            padding: "8px 12px",
            borderRadius: "4px",
            backgroundColor: "#011b58ff",
            color: "white",
            border: "none",
            cursor: "pointer",
          }}
        >
          {showLegend ? "Hide Key" : "Show Key"}
        </button>

        <Link to="/" style={{ textDecoration: "none" }}>
          <button
            style={{
              padding: "8px 12px",
              borderRadius: "4px",
              backgroundColor: "#013b58ff",
              color: "white",
              border: "none",
              cursor: "pointer",
            }}
          >
            Back to Home
          </button>
        </Link>

        <Link to="/history">
          <button
            style={{
              padding: "8px 12px",
              borderRadius: "4px",
              backgroundColor: "#015852ff",
              color: "white",
              border: "none",
              cursor: "pointer",
            }}
          >
            Schedule History
          </button>
        </Link>

        {/* Edit Mode */}
        <button
          onClick={() => setIsEditMode(!isEditMode)}
          style={{
            padding: "8px 12px",
            borderRadius: "4px",
            backgroundColor: isEditMode ? "#555" : "#015821ff",
            color: "white",
            border: "none",
            cursor: "pointer",
          }}
        >
          {isEditMode ? "Exit Edit Mode" : "Edit Mode"}
        </button>
      </div>

      {/* Floating Edit Buttons (only visible in edit mode) */}
      {isEditMode && (
        <div
          style={{
            position: "fixed",
            top: "80px",
            right: "30px",
            zIndex: 20,
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            backgroundColor: "white",
            padding: "16px",
            borderRadius: "8px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
          }}
        >
          <button style={editButton}>Swap Residents</button>
          <button style={editButton}>Change Service</button>
          <button style={editButton}>Add Vacation</button>
          <button style={editButton}>Edit/Remove Vacation</button>
          <hr />
          <button
            style={{ ...editButton, backgroundColor: "#4caf50" }}
            onClick={() => setIsEditMode(false)}
          >
            Save Changes
          </button>
          <button
            style={{ ...editButton, backgroundColor: "#f44336" }}
            onClick={() => setIsEditMode(false)}
          >
            Cancel
          </button>
        </div>
      )}

      {/* Legend */}
      {showLegend && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "12px",
            marginBottom: "16px",
            position: "relative",
            zIndex: 10,
          }}
        >
          {Object.entries(colorMap).map(([label, color]) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <div style={{ width: "20px", height: "20px", backgroundColor: color, border: "1px solid black" }} />
              <span>{label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      <table
        style={{
          borderCollapse: "collapse",
          border: "2px solid black",
          tableLayout: "fixed",
          width: "100%",
          position: "relative",
          zIndex: 10,
        }}
      >
        <thead>
          <tr>
            <th style={{ border: "1px solid black", width: "100px", height: "40px" }}>Resident</th>
            {Array.from({ length: 52 }).map((_, i) => (
              <th key={i} style={{ border: "1px solid black", width: "40px", height: "40px" }}>
                W{i + 1}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {residentKeys.map((resident, idx) => (
            <React.Fragment key={resident}>
              <tr>
                <td
                  style={{
                    border: "1px solid black",
                    fontWeight: "bold",
                    width: "100px",
                    height: "40px",
                  }}
                >
                  {resident}
                </td>
                {(schedule[resident] || []).map((week, widx) => (
                  <td
                    key={widx}
                    onClick={() => {
                      if (isEditMode) {
                        alert(`Clicked ${resident} week ${widx + 1}`);
                      }
                    }}
                    style={{
                      border: "1px solid black",
                      width: "40px",
                      height: "40px",
                      backgroundColor:
                       week === "CC" ? "black" :
                        week === "VAC" ? "red" :
                        week === "Elective" ? "lightgray" :
                        week === "stroke" ? "lightgreen" :
                        week === "B/U" ? "lightblue" :
                        week === "wards" ? "yellow" :
                        week === "VA" ? "purple" : "white",
                      color: week === "CC" || week === "VAC" ? "white" : "black",
                      cursor: isEditMode ? "pointer" : "default",
                    }}
                  />
                ))}
              </tr>

              {/* Dividers */}
              {idx === 9 && (
                <tr>
                  <td colSpan={53} style={{ border: "1px solid black", height: "20px", backgroundColor: "white" }}></td>
                </tr>
              )}
              {idx === 19 && (
                <tr>
                  <td colSpan={53} style={{ border: "1px solid black", height: "20px", backgroundColor: "white" }}></td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>

        <tfoot>
          <tr>
            <td style={{ border: "1px solid black", fontWeight: "bold", width: "100px", height: "40px" }}>
              Weekly Count
            </td>
            {weeklyCounts.map((count, idx) => (
              <td
                key={idx}
                style={{
                  border: "1px solid black",
                  width: "40px",
                  height: "40px",
                  textAlign: "center",
                  fontWeight: "bold",
                  backgroundColor: "lightgray",
                }}
              >
                {count}
              </td>
            ))}
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

// small style helper for the floating buttons
const editButton = {
  padding: "8px 12px",
  borderRadius: "4px",
  border: "none",
  backgroundColor: "#011b58ff",
  color: "white",
  cursor: "pointer",
};
