  import { Link } from "react-router-dom";
  import scheduleData from "./schedule.json";
  import React, { useState, useEffect } from "react";

export default function ScheduleTable({ scheduleSetId }) {
  const [schedule, setSchedule] = useState({});
  const [originalSchedule, setOriginalSchedule] = useState({});
  const [showLegend, setShowLegend] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [weeks, setWeeks] = useState([]);
  const [weeklyCounts, setWeeklyCounts] = useState([]);
  const [selectedCells, setSelectedCells] = useState([]); // for swaps
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

      console.log("FULL API RESPONSE:", data);
      console.log("Type of data:", typeof data);
      console.log("Is data null?", data === null);
      console.log("Is data undefined?", data === undefined);

      console.log("Data exists, type:", typeof data);
      console.log("Has 'grouped' property?", 'grouped' in data);
      console.log("Has 'weeks' property?", 'weeks' in data);
      console.log("Has 'weeklyCounts' property?", 'weeklyCounts' in data);

      const groupedData = data.grouped || {};
      console.log("=== GROUPED DATA ===", groupedData);
      console.log("Type of grouped:", typeof groupedData);
      console.log("Number of keys in grouped:", Object.keys(groupedData).length);

      // Check each key in grouped data
      Object.keys(groupedData).forEach((key, index) => {
        console.log(`Key ${index}: "${key}"`, {
          value: groupedData[key],
          isArray: Array.isArray(groupedData[key]),
          length: Array.isArray(groupedData[key]) ? groupedData[key].length : 'N/A',
          firstFewItems: Array.isArray(groupedData[key]) ? groupedData[key].slice(0, 3) : 'N/A'
        });
      });
      
        setSchedule(data.grouped || {});
        setOriginalSchedule(JSON.parse(JSON.stringify(data.grouped || {}))); // keep original for discard
        setWeeks(data.weeks || []);
        setWeeklyCounts(data.weeklyCounts || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadSchedule();
  }, [scheduleSetId]);

        if (loading) return <p>Loading schedule...</p>;
        if (error) return <p>Error: {error}</p>;
    const residentKeys = Object.keys(schedule || {});

  // --- new edit helpers --- this better work 
  const handleCellClick = (resident, weekIdx) => {
    if (!isEditMode) return;
    const cellId = `${resident}-${weekIdx}`;
    const alreadySelected = selectedCells.find((c) => c.id === cellId);

    if (alreadySelected) {
      setSelectedCells(selectedCells.filter((c) => c.id !== cellId));
      return;
    }

    const newSelection = [...selectedCells, { id: cellId, resident, weekIdx }];
    setSelectedCells(newSelection);

    if (newSelection.length === 2) {
      const [a, b] = newSelection;
      setSchedule((prev) => {
        const updated = { ...prev };
        const temp = updated[a.resident][a.weekIdx];
        updated[a.resident][a.weekIdx] = updated[b.resident][b.weekIdx];
        updated[b.resident][b.weekIdx] = temp;
        return updated;
      });
      setSelectedCells([]);
    }
  };

  const handleDeleteCell = () => {
    if (selectedCells.length === 0) return;
    setSchedule((prev) => {
      const updated = { ...prev };
      selectedCells.forEach(({ resident, weekIdx }) => {
        updated[resident][weekIdx] = "";
      });
      return updated;
    });
    setSelectedCells([]);
  };

  const handleSetCell = (service) => {
    if (selectedCells.length === 0) return;
    setSchedule((prev) => {
      const updated = { ...prev };
      selectedCells.forEach(({ resident, weekIdx }) => {
        updated[resident][weekIdx] = service;
      });
      return updated;
    });
    setSelectedCells([]);
  };

  const handleDiscard = () => {
    setSchedule(JSON.parse(JSON.stringify(originalSchedule)));
    setSelectedCells([]);
    setIsEditMode(false);
  };

  const handleUpdate = () => {
    setOriginalSchedule(JSON.parse(JSON.stringify(schedule)));
    setSelectedCells([]);
    setIsEditMode(false);
  };

  // evil evil buttons 
  return (
    <div style={{ overflow: "auto", padding: "16px", position: "relative" }}>
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

      <h1 className="text-2xl font-bold mb-2">Resident Schedule</h1>

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

        {/* Back Buttons */}
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

        {/* Edit Toggle */}
        <button
          onClick={() => {
            setIsEditMode(!isEditMode);
            setSelectedCells([]);
          }}
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

        {/* --- Only show in Edit Mode --- */}
        {isEditMode && (
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={() => handleSetCell("CC")}
              style={{
                padding: "6px 10px",
                backgroundColor: "black",
                color: "white",
                border: "none",
                borderRadius: "4px",
              }}
            >
              Set CC
            </button>
            <button
              onClick={() => handleSetCell("VAC")}
              style={{
                padding: "6px 10px",
                backgroundColor: "red",
                color: "white",
                border: "none",
                borderRadius: "4px",
              }}
            >
              Set VAC
            </button>
            <button
              onClick={() => handleSetCell("UH")}
              style={{
                padding: "6px 10px",
                backgroundColor: "yellow",
                color: "black",
                border: "none",
                borderRadius: "4px",
              }}
            >
              Set UH
            </button>
            <button
              onClick={() => handleSetCell("")}
              style={{
                padding: "6px 10px",
                backgroundColor: "lightgray",
                border: "none",
                borderRadius: "4px",
              }}
            >
              Set Empty
            </button>
            <button
              onClick={handleDeleteCell}
              style={{
                padding: "6px 10px",
                backgroundColor: "#7c2d2d",
                color: "white",
                border: "none",
                borderRadius: "4px",
              }}
            >
              {/* do we need this ? */}
              Delete 
            </button>
            <button
              onClick={handleDiscard}
              style={{
                padding: "6px 10px",
                backgroundColor: "#4f4f4f",
                color: "white",
                border: "none",
                borderRadius: "4px",
              }}
            >
              Discard
            </button>
            <button
              onClick={handleUpdate}
              style={{
                padding: "6px 10px",
                backgroundColor: "#15803d",
                color: "white",
                border: "none",
                borderRadius: "4px",
              }}
            >
              Update
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
              <div
                style={{
                  width: "20px",
                  height: "20px",
                  backgroundColor: color,
                  border: "1px solid black",
                }}
              />
              <span>{label || "Empty"}</span>
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
            <th style={{ border: "1px solid black", width: "120px", height: "40px" }}>Resident</th>
            {weeks.map((week, i) => (
              <th key={i} style={{ border: "1px solid black", width: "80px", height: "40px" }}>
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
                {(schedule[resident] || []).map((week, widx) => {
                  const isSelected = selectedCells.some(
                    (c) => c.resident === resident && c.weekIdx === widx
                  );
                  return (
                    <td
                      key={widx}
                      onClick={() => handleCellClick(resident, widx)}
                      style={{
                        border: "1px solid black",
                        width: "40px",
                        height: "40px",
                        backgroundColor: isSelected
                          ? "orange"
                          : colorMap[week] || "white",
                        color: week === "CC" || week === "VAC" ? "white" : "black",
                        textAlign: "center",
                        cursor: isEditMode ? "pointer" : "default",
                      }}
                    >
                      {week ? week[0] : ""}
                    </td>
                  );
                })}
              </tr>
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
