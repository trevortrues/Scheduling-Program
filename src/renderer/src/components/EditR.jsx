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

  // Each vacation has a day and priority
  const [vacationDays, setVacationDays] = useState([{ day: "", priority: "1" }]);
  const [startingService, setStartingService] = useState("");

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

          // If resident has vacationDays saved, use them; otherwise, default
          if (found.vacationDays && found.vacationDays.length > 0) {
            setVacationDays(found.vacationDays);
          }
          setStartingService(found.startingService || "");
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

  // Update vacation day or priority
  const handleVacationChange = (index, field, value) => {
    const updated = [...vacationDays];
    updated[index][field] = value;
    setVacationDays(updated);
  };

  // Add another vacation input
  const handleAddVacation = () => {
    setVacationDays([...vacationDays, { day: "", priority: "1" }]);
  };

  //  form submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Update resident with new fields including vacationDays and startingService
      await window.api.updateResident(resident.res_id, {
        first_name: firstName,
        last_name: lastName,
        pgy_level: pgyLevel,
        vacationDays: vacationDays,
        startingService: startingService,
      });

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

      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", flexDirection: "column", gap: "12px", maxWidth: "400px" }}
      >
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

        {/* Vacation Days Section */}
        <label>
          Vacation Days and Priority 
          {vacationDays.map((v, index) => (
            <div key={index} style={{ display: "flex", gap: "6px", marginBottom: "8px" }}>
              <input
                type="text"
                placeholder={`Name of Vacation`}
                value={v.day}
                onChange={(e) => handleVacationChange(index, "day", e.target.value)}
                style={{ padding: "8px", flex: 1 }}
              />
              
              <select
                value={v.priority}
                onChange={(e) => handleVacationChange(index, "priority", e.target.value)}
                style={{ padding: "8px", width: "80px" }}
              >
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
              </select>
            </div>
          ))}

          <button
            type="button"
            onClick={handleAddVacation}
            style={{
              padding: "6px 10px",
              borderRadius: "4px",
              backgroundColor: "#375497ff",
              color: "white",
              border: "none",
              cursor: "pointer",
              marginTop: "4px",
            }}
          >
            + Add Another
          </button>
        </label>

        {/* Starting Service Section */}
        <label>
          Starting Service:
          <input
            type="text"
            placeholder="Enter starting service"
            value={startingService}
            onChange={(e) => setStartingService(e.target.value)}
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
