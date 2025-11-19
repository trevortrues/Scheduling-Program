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
  const [selectedCells, setSelectedCells] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  //  service dropdown state
  const [showServicePicker, setShowServicePicker] = useState(false);

  // Map services to colors
    const colorMap = {
      CC: "black",
      VAC: "red",
      ELECTIVE: "lightgray",
      Stroke: "lightgreen",
      UH: "yellow",
      VA: "purple",
      NF: "lightblue", 
    };

  useEffect(() => {
    async function loadSchedule() {
      try {
        const data = await window.api.getFullSchedule(scheduleSetId);
        const groupedData = data.grouped || {};
        setSchedule(groupedData);
        setOriginalSchedule(JSON.parse(JSON.stringify(groupedData)));
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

  // CLICK TO SELECT CELLS
  const handleCellClick = (resident, weekIdx) => {
    if (!isEditMode) return;

    const id = `${resident}-${weekIdx}`;
    const exists = selectedCells.find((c) => c.id === id);

    if (exists) {
      setSelectedCells(selectedCells.filter((c) => c.id !== id));
      return;
    }

    const updated = [...selectedCells, { id, resident, weekIdx }];
    setSelectedCells(updated);
  };

  //  SWAP BUTTON
  const handleSwap = () => {
    if (selectedCells.length !== 2) return;

    const [a, b] = selectedCells;

    setSchedule((prev) => {
      const updated = { ...prev };
      const temp = updated[a.resident][a.weekIdx];
      updated[a.resident][a.weekIdx] = updated[b.resident][b.weekIdx];
      updated[b.resident][b.weekIdx] = temp;
      return updated;
    });

    setSelectedCells([]);
  };

  // SET USING DROPDOWN
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
    setShowServicePicker(false);
  };

  // DISCARD
  const handleDiscard = () => {
    setSchedule(JSON.parse(JSON.stringify(originalSchedule)));
    setSelectedCells([]);
    setIsEditMode(false);
  };

  // SAVE UPDATE
  const handleUpdate = () => {
    setOriginalSchedule(JSON.parse(JSON.stringify(schedule)));
    setSelectedCells([]);
    setIsEditMode(false);
  };

  // evil evil buttons 
  const getServiceText = (service) => {
    if (!service) return "";
    if (service.toLowerCase().includes("float")) return "F";
    return service.substring(0, 4).toUpperCase();
  };

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

      {/* ACTION BUTTONS */}
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

        {/* EDIT MODE TOGGLE */}
        <button
          onClick={() => {
            if (isEditMode) {
              setSchedule(JSON.parse(JSON.stringify(originalSchedule)));
              setSelectedCells([]);
              setIsEditMode(false);
            } else {
              setIsEditMode(true);
            }
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

        {/* EDIT MODE BUTTONS  */}

        {isEditMode && (
          <>
            {/*  SWAP BUTTON */}
            <button
              onClick={handleSwap}
              disabled={selectedCells.length !== 2}
              style={{
                padding: "6px 10px",
                backgroundColor:
                  selectedCells.length === 2 ? "#4b4bb8" : "#888",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: selectedCells.length === 2 ? "pointer" : "not-allowed",
              }}
            >
              Swap
            </button>

            {/* SET SERVICE DROPDOWN */}
            <button
              onClick={() => setShowServicePicker(!showServicePicker)}
              style={{
                padding: "6px 10px",
                backgroundColor: "#333",
                color: "white",
                border: "none",
                borderRadius: "4px",
              }}
            >
              Set Service
            </button>

            {showServicePicker && (
              <select
                onChange={(e) => handleSetCell(e.target.value)}
                defaultValue=""
                style={{
                  padding: "6px",
                  borderRadius: "6px",
                }}
              >
                <option value="" disabled>
                  Choose Service
                </option>
                {Object.keys(colorMap).map((svc) => (
                  <option key={svc} value={svc}>
                    {svc}
                  </option>
                ))}
              </select>
            )}

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
          </>
        )}
      </div>

      {/* LEGEND */}
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
            <div
              key={label}
              style={{ display: "flex", alignItems: "center", gap: "4px" }}
            >
              <div
                style={{
                  width: "20px",
                  height: "20px",
                  backgroundColor: color,
                  border: "1px solid black",
                }}
              />
              <span>{label}</span>
            </div>
          ))}
        </div>
      )}

      {/* TABLE */}
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
            <th style={{ border: "1px solid black", width: "120px" }}>
              Resident
            </th>
            {weeks.map((week, i) => (
              <th key={i} style={{ border: "1px solid black", width: "80px" }}>
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
                        textAlign: "center",
                        cursor: isEditMode ? "pointer" : "default",
                        backgroundColor: isSelected
                          ? "orange"
                          : colorMap[week] || "white",
                        color:
                          week === "CC" || week === "VAC" ? "white" : "black",

                        /* NEW POP-OUT EFFECT */
                        transform: isSelected ? "scale(1.15)" : "scale(1)",
                        transition: "0.1s ease",
                        zIndex: isSelected ? 20 : 1,

                        /* NEW SMALLER TEXT */
                        fontSize: "10px",
                        fontWeight: "bold",
                      }}
                    >
                      {getServiceText(week)}
                    </td>
                  );
                })}
              </tr>

              {idx === 9 || idx === 19 ? (
                <tr>
                  <td
                    colSpan={weeklyCounts.length + 1}
                    style={{ height: "20px", backgroundColor: "white" }}
                  />
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
