import { Link } from "react-router-dom";
import scheduleData from "./schedule.json";
import React, { useState, useEffect } from "react";

export default function ScheduleTable() {
  const [schedule, setSchedule] = useState({});
  const [showLegend, setShowLegend] = useState(false);

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
    <div style={{ overflow: "auto", padding: "16px" }}>
      {/* Header */}
      <h1 className="text-2xl font-bold mb-2">Resident Schedule</h1>

      {/* Buttons */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "16px", alignItems: "center" }}>
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
      </div>

      {showLegend && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", marginBottom: "16px" }}>
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
                <td style={{ border: "1px solid black", fontWeight: "bold", width: "100px", height: "40px" }}>
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
