import scheduleData from "./schedule.json";
import React, { useState, useEffect } from "react";

export default function ScheduleTable() {
  const [schedule, setSchedule] = useState({});

  useEffect(() => {
    setSchedule(scheduleData);
  }, []);

  const residentKeys = schedule ? Object.keys(schedule).filter((k) => k !== "weekly_counts") : [];
  const weeklyCounts = schedule?.weekly_counts || []; 

  return (
    <div style={{ overflow: "auto", padding: "16px" }}>
      <table style={{ borderCollapse: "collapse", border: "2px solid black" }}>
        <thead>
          <tr>
            <th style={{ border: "1px solid black", padding: "4px" }}>Resident</th>
            {Array.from({ length: 52 }).map((_, i) => (
              <th key={i} style={{ border: "1px solid black", padding: "4px" }}>
                W{i + 1}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {residentKeys.map((resident, idx) => (
            <React.Fragment key={resident}>
              {/* Normal resident row */}
              <tr>
                <td style={{ border: "1px solid black", padding: "4px", fontWeight: "bold" }}>
                  {resident}
                </td>
                {(schedule[resident] || []).map((week, widx) => (
                  <td
                    key={widx}
                    style={{
                      border: "1px solid black",
                      padding: "4px",
                      textAlign: "center",
                      backgroundColor:
                        week === "CC"
                          ? "black"
                          : week === "VAC"
                          ? "red"
                          : week === "Elective"
                          ? "lightgray"
                          : week === "stroke"
                          ? "lightgreen"
                          : week === "B/U"
                          ? "lightblue"
                          : week === "wards"
                          ? "yellow"
                          : week === "VA"
                          ? "purple"
                          : "white",
                      color: week === "CC" || week === "VAC" ? "white" : "black",
                    }}
                  >
                    {week}
                  </td>
                ))}
              </tr>

              {/* Empty row after first 10 residents */}
              {idx === 9 && (
                <tr>
                  <td
                    colSpan={53}
                    style={{ border: "1px solid black", height: "20px", backgroundColor: "white" }}
                  ></td>
                </tr>
              )}

              {/* Empty row (space) after next 10 residents, i.e., after 20th */}
              {idx === 19 && (
                <tr>
                  <td
                    colSpan={53}
                    style={{ border: "1px solid black", height: "20px", backgroundColor: "white" }}
                  ></td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td style={{ border: "1px solid black", padding: "4px", fontWeight: "bold" }}>
              Weekly Count
            </td>
            {weeklyCounts.map((count, idx) => (
              <td
                key={idx}
                style={{
                  border: "1px solid black",
                  padding: "4px",
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