import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";

export default function EditR() {
  const { res_id } = useParams();
  const navigate = useNavigate();
  const [resident, setResident] = useState(null);
  const [loading, setLoading] = useState(true);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [pgyLevel, setPgyLevel] = useState("");

  // Load resident data
  useEffect(() => {
    const fetchResident = async () => {
      try {
        const allResidents = await window.api.getResidents(false);
        const found = allResidents.find((r) => r.res_id === Number(res_id));
        if (found) {
          setResident(found);
          setFirstName(found.first_name);
          setLastName(found.last_name);
          setPgyLevel(found.pgy_level);
        }
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

  // Handle form submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Call your updateResident API (you may need to add this)
      await window.api.updateResident(resident.res_id, firstName, lastName, pgyLevel);
      alert("Resident updated successfully!");
      navigate("/resident");
    } catch (err) {
      console.error("Failed to update resident:", err);
      alert("Error updating resident.");
    }
  };

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
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px", maxWidth: "400px" }}>
        <label>
          First Name:
          <input
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
            style={{ padding: "8px", width: "100%" }}
          />
        </label>

        <label>
          Last Name:
          <input
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
            style={{ padding: "8px", width: "100%" }}
          />
        </label>

        <label>
          PGY Level:
          <input
            type="number"
            min="1"
            max="10"
            value={pgyLevel}
            onChange={(e) => setPgyLevel(e.target.value)}
            required
            style={{ padding: "8px", width: "100%" }}
          />
        </label>

        <button
          type="submit"
          style={{
            padding: "8px 12px",
            borderRadius: "4px",
            backgroundColor: "#011b58ff",
            color: "white",
            border: "none",
            cursor: "pointer",
          }}
        >
          Save Changes
        </button>
      </form>
    </div>
  );
}
