import { Link } from "react-router-dom";
import scheduleData from "./schedule.json";
import React, { useState, useEffect } from "react";

export default function ScheduleTable({ scheduleSetId }) {
  const [schedule, setSchedule] = useState({});
  const [originalSchedule, setOriginalSchedule] = useState({});
  const [showLegend, setShowLegend] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [weekIds, setWeekIds] = useState([]); // New state for week IDs
  const [weeks, setWeeks] = useState([]);
  const [weeklyCounts, setWeeklyCounts] = useState([]);
  const [selectedCells, setSelectedCells] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [residentIds, setResidentIds] = useState({}); //resident id mapping
  const [actionQueue, setActionQueue] =useState([]);
  const actions = actionQueue.length / 2;
  const [showServicePicker, setShowServicePicker] = useState(false);

  // WEEK SUMMARY OVERLAY
    const [showWeekSummary, setShowWeekSummary] = useState(false);
    const [summaryWeekIndex, setSummaryWeekIndex] = useState(null);
    const [summaryData, setSummaryData] = useState({});

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
        setWeekIds(data.weekIds || []); // Set week IDs
        setResidentIds(data.residentIds || {}); // Set resident IDs mapping
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
    
    const cellId = `${resident}-${weekIdx}`;
    const exists = selectedCells.find((c) => c.id === cellId);
    
    if (exists) {
      setSelectedCells(selectedCells.filter((c) => c.id !== cellId));
      return;
    }

    const updated = [...selectedCells, { id: cellId, resident, weekIdx }];
    setSelectedCells(updated);
  };
  
  //queue action function
  const queueAction = (action) => {
    setActionQueue((prev) => [...prev, action]);
  };

  // Handle delete as setting empty service
  const handleDeleteCell = () => {
    if (selectedCells.length === 0) return;
    
    setSchedule((prev) => {
      const updated = { ...prev };
      selectedCells.forEach(({ resident, weekIdx }) => {
        const oldService = updated[resident][weekIdx];
        updated[resident][weekIdx] = "";
        const weekId = weekIds[weekIdx]; // Get the actual week ID
        const resId = residentIds[resident];
        
        // Queue DELETE as SET_SERVICE with empty string
        queueAction({
          type: "SET_SERVICE",
          res_id: resId,
          week_id: weekId, // Use week_id
          newService: "",
          oldService: oldService
        });
      });
      return updated;
    });

    setSelectedCells([]);
  };
  
  // SWAP BUTTON HANDLER
  const handleSwap = () => {
    if (selectedCells.length !== 2) return;

    const [a, b] = selectedCells;

    setSchedule((prev) => {
      const updated = { ...prev };
      const temp = updated[a.resident][a.weekIdx];
      const tempOldServiceA = updated[a.resident][a.weekIdx];
      const tempOldServiceB = updated[b.resident][b.weekIdx];
      
      // Swap in UI
      updated[a.resident][a.weekIdx] = updated[b.resident][b.weekIdx];
      updated[b.resident][b.weekIdx] = temp;

      // Queue both swap actions
      const weekIdA = weekIds[a.weekIdx];
      const weekIdB = weekIds[b.weekIdx];
      const resIdA = residentIds[a.resident];
      const resIdB = residentIds[b.resident];

      if (resIdA && weekIdA) {
        queueAction({
          type: "SET_SERVICE",
          res_id: resIdA,
          week_id: weekIdA,
          newService: updated[a.resident][a.weekIdx],
          oldService: tempOldServiceA
        });
      }

      if (resIdB && weekIdB) {
        queueAction({
          type: "SET_SERVICE",
          res_id: resIdB,
          week_id: weekIdB,
          newService: updated[b.resident][b.weekIdx],
          oldService: tempOldServiceB
        });
      }

      return updated;
    });

    setSelectedCells([]);
  };


   // OPEN WEEK SUMMARY OVERLAY
    const openWeekSummary = (weekIdx) => {
      const counts = {};

      // Initialize ALL services to 0
      Object.keys(colorMap).forEach((svc) => {
        counts[svc] = 0;
      });

      // Count services for that week
      residentKeys.forEach((resident) => {
        const svc = schedule[resident][weekIdx];
        if (!svc) return;
        if (counts[svc] !== undefined) {
          counts[svc] += 1;
        }
      });

      setSummaryData(counts);
      setSummaryWeekIndex(weekIdx);
      setShowWeekSummary(true);
    };
  // SET USING DROPDOWN
  const handleSetCell = (service) => {
    if (selectedCells.length === 0) return;

    setSchedule((prev) => {
      const updated = { ...prev };
      selectedCells.forEach(({ resident, weekIdx }) => {
        const oldService = updated[resident][weekIdx];
        updated[resident][weekIdx] = service;
        
        //queue action
        const weekId = weekIds[weekIdx];
        const resId= residentIds[resident];
        
        if (resId && weekId) {
          queueAction({
            type: "SET_SERVICE",
            res_id: resId,
            week_id: weekId,
            newService: service,
            oldService: oldService
          });
        }
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
    setActionQueue([]);
    setIsEditMode(false);
    setShowServicePicker(false);
  };

  const handleUpdate = async () => {
    if (actionQueue.length === 0) {
      alert("No changes to update!");
      return;
    }

    try {
      console.log("Processing action queue:", actionQueue);

      for (const action of actionQueue) {
        console.log("Processing action:", action);

        if (action.newService === "VAC") {
          await window.api.setResidentVacation(
            action.res_id, 
            action.week_id, // Use week_id
            1
          );
        } else if (action.newService === "") {
          await window.api.setResidentService(
            action.res_id, 
            action.week_id,
            null
          );
        } else {
          await window.api.setResidentService(
            action.res_id,
            action.week_id,
            action.newService
          );
        }
      }

      // After successful DB update:
      setOriginalSchedule(JSON.parse(JSON.stringify(schedule)));
      setActionQueue([]);
      setIsEditMode(false);
      setSelectedCells([]);
      setShowServicePicker(false);


      alert(`Successfully updated ${actionQueue.length/2} assignment(s)!`);

    } catch (err) {
      console.error("DB Update Error:", err);
      alert("Failed to update database: " + err.message);
    }
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

     {/* PENDING CHANGES NOTIFICATION */}
      {isEditMode && actionQueue.length > 0 && (
        <div style={{
          padding: "8px 12px",
          backgroundColor: "#e3f2fd",
          border: "1px solid #2196f3",
          borderRadius: "4px",
          marginBottom: "16px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          <div>
            <strong>Pending Changes:</strong> {actionQueue.length / 2} assignment(s) queued for update 
          </div>
          <button
            onClick={() => {
              if (window.confirm("Clear all pending changes?")) {
                setActionQueue([]);
              }
            }}
            style={{
              padding: "4px 8px",
              backgroundColor: "#ff6b6b",
              color: "white",
              border: "none",
              borderRadius: "3px",
              cursor: "pointer",
              fontSize: "12px"
            }}
          >
            Clear Queue
          </button>
        </div>
      )}

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
              handleDiscard();
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
            {/* DELETE BUTTON */}
            <button
              onClick={handleDeleteCell}
              disabled={selectedCells.length === 0}
              style={{
                padding: "6px 10px",
                backgroundColor: selectedCells.length > 0 ? "#dc2626" : "#888",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: selectedCells.length > 0 ? "pointer" : "not-allowed",
              }}
            >
              Delete
            </button>

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

      {/* WEEK SUMMARY OVERLAY */}
{showWeekSummary && (
  <div
    style={{
      position: "fixed",
      top: 0,
      left: 0,
      width: "100vw",
      height: "100vh",
      backgroundColor: "rgba(0,0,0,0.5)",
      zIndex: 999,
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
    }}
  >
    <div
      style={{
        background: "white",
        padding: "20px",
        borderRadius: "8px",
        minWidth: "300px",
        maxWidth: "400px",
        boxShadow: "0 4px 10px rgba(0,0,0,0.3)",
      }}
    >
      <h2 style={{ marginBottom: "10px", fontSize: "20px", fontWeight: "bold" }}>
        Week Summary: {weeks[summaryWeekIndex].start} - {weeks[summaryWeekIndex].end}
      </h2>

      <div style={{ marginBottom: "16px" }}>
        {Object.keys(summaryData).length === 0 ? (
          <p>No assigned services this week.</p>
        ) : (
          Object.entries(summaryData).map(([svc, count]) => (
            <p key={svc} style={{ fontSize: "16px" }}>
              <strong>{svc}</strong>: {count}
            </p>
          ))
        )}
      </div>

      <button
        onClick={() => setShowWeekSummary(false)}
        style={{
          padding: "8px 12px",
          backgroundColor: "#4b5563",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer",
        }}
      >
        Close
          </button>
        </div>
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
            <th
              key={i}
              onClick={() => openWeekSummary(i)}
              style={{
                border: "1px solid black",
                width: "80px",
                cursor: "pointer",
                backgroundColor: "#dbeafe"
              }}
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
