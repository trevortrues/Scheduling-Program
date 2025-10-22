import { Link } from "react-router-dom";
import scheduleData from "./schedule.json";
import React, { useState, useEffect } from "react";

export default function ScheduleTable({ scheduleSetId }) {
  const [schedule, setSchedule] = useState({});
  const [showLegend, setShowLegend] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [weeks, setWeeks] = useState([]);


  // Map services to colors
  const colorMap = {
    CC: "black",
    VAC: "red",
    ELECTIVE: "lightgray",
    Stroke: "lightgreen",
    UH: "yellow",
    VA: "purple",
  };

  useEffect(() => {
    async function loadSchedule() {
      try {
        const data = await window.api.getFullSchedule(scheduleSetId);

        const weeks = [
          ...new Map(
            data.map(row => [
              row.week_start, 
              { 
                start: row.week_start.slice(5).replace("-", "/"),
                end: row.week_end.slice(5).replace("-", "/")     
              }
            ])
          ).values()
        ];
        setWeeks(weeks);

        const grouped = {};
        
        const weekIndexMap = weeks.reduce((acc, week, idx) => {
          acc[week.start] = idx; 
          return acc;
        }, {});

        data.forEach((row) => {
          const name = row.resident_name;
          if (!grouped[name]) grouped[name] = Array(weeks.length).fill("");

          const weekKey = row.week_start.slice(5).replace("-", "/");
          const weekIndex = weekIndexMap[weekKey];

          if (weekIndex !== undefined) {
            const service = row.is_vacation ? "VAC" : row.service || "";
            grouped[name][weekIndex] = service;
          }
        });

        const weeklyCounts = weeks.map((_, i) => {
          return Object.values(grouped).filter((arr) => arr[i] && arr[i] !== "" && arr[i] !== "VAC").length;
        });

        grouped.weekly_counts = weeklyCounts;
        setSchedule(grouped);
      } catch (err) {
        console.error("Failed to load schedule:", err);
      }
    }
    loadSchedule();
  }, [scheduleSetId]);

  const residentKeys = schedule ? Object.keys(schedule).filter((k) => k !== "weekly_counts") : [];
  const weeklyCounts = schedule?.weekly_counts || [];

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
        {/* Show Legend */}
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

      {/* Schedule Table */}
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
            <th style={{ border: "1px solid black", width: "120px", height: "40px" }}>Resident</th>
              {weeks.map((week, i) => (
                <th
                  key={i}
                  style={{ border: "1px solid black", width: "80px", height: "40px" }}
                >
                  {week.start} - {week.end}
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
                    width: "120px",
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
                      backgroundColor: colorMap[week] || "white",
                      color: week === "CC" || week === "VAC" ? "white" : "black",
                      textAlign: "center",
                    }}
                  >
                    {week ? week[0] : ""}
                  </td>
                ))}
              </tr>

              {/* Optional spacer rows for visual grouping */}
              {idx === 9 || idx === 19 ? (
                <tr>
                  <td colSpan={weeklyCounts.length + 1} style={{ height: "20px", backgroundColor: "white" }} />
                </tr>
              ) : null}
            </React.Fragment>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td
              style={{
                border: "1px solid black",
                fontWeight: "bold",
                height: "40px",
                backgroundColor: "#f0f0f0",
              }}
            >
              Weekly Count
            </td>
            {weeklyCounts.map((count, idx) => (
              <td
                key={idx}
                style={{
                  border: "1px solid black",
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