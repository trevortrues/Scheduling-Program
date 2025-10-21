import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";

export default function EditR() {
  const { res_id } = useParams(); // gets the ID from the URL
  const [resident, setResident] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchResident = async () => {
      try {
        // get all residents (active and inactive)
        const allResidents = await window.api.getResidents(false); 
        // find the one that matches the ID from the URL
        const found = allResidents.find((r) => r.res_id === Number(res_id));
        setResident(found || null);
      } catch (err) {
        console.error("Failed to load resident:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchResident();
  }, [res_id]);

  if (loading) return <p>Loading resident data...</p>;
  if (!resident) return <p>Resident not found.</p>;

  return (
    <div style={{ padding: "16px" }}>
      <Link to="/resident" style={{ textDecoration: "none" }}>
        <button
          style={{
            padding: "8px 12px",
            borderRadius: "4px",
            backgroundColor: "#090101ff",
            color: "white",
            border: "none",
            cursor: "pointer",
            marginBottom: "16px",
          }}
        >
          Back to Residents
        </button>
      </Link>

      <h2>Edit Resident</h2>
      <p><b>ID:</b> {resident.res_id}</p>
      <p><b>First Name:</b> {resident.first_name}</p>
      <p><b>Last Name:</b> {resident.last_name}</p>
      <p><b>PGY Level:</b> {resident.pgy_level}</p>

      <p style={{ marginTop: "20px", color: "#666" }}>
        (Form to edit resident details will go here)
      </p>
    </div>
  );
}
