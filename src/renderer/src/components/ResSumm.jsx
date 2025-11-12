import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";

export default function ResSumm() {
  const { res_id } = useParams();
  const [resident, setResident] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchResident = async () => {
      try {
        const allResidents = await window.api.getResidents(false);
        const found = allResidents.find((r) => r.res_id === Number(res_id));
        if (found) setResident(found);
      } catch (err) {
        console.error("Failed to load resident summary:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchResident();
  }, [res_id]);

  if (loading) return <p>Loading summary...</p>;
  if (!resident) return <p>Resident not found.</p>;

  return (
    <div style={{ padding: "20px" }}>
      <Link to="/resident" style={{ textDecoration: "none" }}>
        <button
          style={{
            padding: "8px 12px",
            borderRadius: "4px",
            backgroundColor: "#010612ff",
            color: "white",
            border: "none",
            cursor: "pointer",
            marginBottom: "16px",
          }}
        >
          Back to Residents
        </button>
      </Link>

      <h2 style={{ marginBottom: "10px" }}>
        Summary for {resident.first_name} {resident.last_name}
      </h2>

      <p><strong>PGY Level:</strong> {resident.pgy_level}</p>
      <p><strong>Starting Service:</strong> {resident.startingService || "N/A"}</p>

      <h3 style={{ marginTop: "20px" }}>Vacation Days</h3>
      {resident.vacationDays && resident.vacationDays.length > 0 ? (
        <ul>
          {resident.vacationDays.map((v, i) => (
            <li key={i}>
              <strong>{v.name || "Unnamed Vacation"}</strong> – 
              {v.day || "No start date"} to {v.endDay || "No end date"} 
              (Priority {v.priority || "N/A"})
            </li>
          ))}
        </ul>
      ) : (
        <p>No vacation days recorded.</p>
      )}
    </div>
  );
}
