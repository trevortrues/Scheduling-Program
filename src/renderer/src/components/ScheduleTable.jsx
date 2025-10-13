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
            backgroundColor: "rgba(218, 117, 117, 0.64)",
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
          flexWrap: "wrap",
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

        {/* Back to Home */}
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

        {/* Schedule History */}
        <Link to="/history" style={{ textDecoration: "none" }}>
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
            backgroundColor: isEditMode ? "#914f4fff" : "#015821ff",
            color: "white",
            border: "none",
            cursor: "pointer",
          }}
        >
          {isEditMode ? "Exit Edit Mode" : "Edit Mode"}
        </button>

        {/* Edit Mode Buttons (appear only when in edit mode) */}
        {isEditMode && (
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <button
              style={{
                padding: "8px 12px",
                borderRadius: "4px",
                backgroundColor: "#4a4a4a",
                color: "white",
                border: "none",
                cursor: "pointer",
              }}
            >
              Swap
            </button>

            <button
              style={{
                padding: "8px 12px",
                borderRadius: "4px",
                backgroundColor: "#4a4a4a",
                color: "white",
                border: "none",
                cursor: "pointer",
              }}
            >
              Change Service
            </button>

            <button
              style={{
                padding: "8px 12px",
                borderRadius: "4px",
                backgroundColor: "#4a4a4a",
                color: "white",
                border: "none",
                cursor: "pointer",
              }}
            >
              Add Vacation
            </button>

            <button
              style={{
                padding: "8px 12px",
                borderRadius: "4px",
                backgroundColor: "#4a4a4a",
                color: "white",
                border: "none",
                cursor: "pointer",
              }}
            >
              Edit Vacation
            </button>

            <button
              style={{
                padding: "8px 12px",
                borderRadius: "4px",
                backgroundColor: "#015821ff",
                color: "white",
                border: "none",
                cursor: "pointer",
              }}
            >
              Save Changes
            </button>

            <button
              onClick={() => setIsEditMode(false)}
              style={{
                padding: "8px 12px",
                borderRadius: "4px",
                backgroundColor: "#8b0000",
                color: "white",
                border: "none",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
          </div>
        )}
      </div>

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
                    }}
                  />
                ))}
              </tr>

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
