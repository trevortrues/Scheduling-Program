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
  // const [startWeek, setStartWeek] = useState("");
  // const [endWeek, setEndWeek] = useState("");
  // const [priority, setPriority] = useState(1);

  // Each vacation has a day and priority
  const [vacationWeeks, setVacationWeeks] = useState([{ start: "", end: "", priority: 1 }]);
  const [startingService, setStartingService] = useState("");
  const [services, setServices] = useState([]);

  // Load resident data
  useEffect(() => {
    const fetchResident = async () => {
      try {
        const allResidents = await window.api.getResidents(false);
        const residentVacations = await window.api.getResidentVacations(res_id);

        const found = allResidents.find((r) => r.res_id === Number(res_id));
        if (found) {
          setResident(found);
          setFirstName(found.first_name);
          setLastName(found.last_name);
          setPgyLevel(found.pgy_level || "");
          setStartingService(found.startingService || "");
        }

        if (residentVacations && residentVacations.length > 0) {
          setVacationWeeks(
            residentVacations.map((v) => ({
              start: v.week_start,
              end: v.week_end,
              priority: v.vacation_priority,
            }))
          );
        } else {
          setVacationWeeks([{ start: "", end: "", priority: 1 }]);
        }
      } catch (err) {
        console.error("Failed to load resident:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchResident();
  }, [res_id]);

  // NEW,NEW,NEW: Fetch services independently so dropdown works
  useEffect(() => {
    const fetchServices = async () => {
      try {
        const allServices = await window.api.getServices(false);
        setServices(allServices);
      } catch (err) {
        console.error("Failed to load services:", err);
      }
    };
    fetchServices();
  }, []);

  if (loading) return <p>Loading resident data...</p>;
  if (!resident) return <p>Resident not found.</p>;

  // Update vacation day or priority
  const handleVacationChange = (index, field, value) => {
    const updated = [...vacationWeeks];
    updated[index][field] = value;
    setVacationWeeks(updated);
  };

  console.log(vacationWeeks);

  // Add another vacation input
  const handleAddVacation = () => {
    setVacationWeeks([
      ...vacationWeeks,
      { start: "", end: "", priority: 1 },
    ]);
  };

  //  form submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await window.api.updateResident(resident.res_id, {
        first_name: firstName,
        last_name: lastName,
        pgy_level: pgyLevel,
      });

    for (const v of vacationWeeks) {
      const week_start = v.start;
      const vacation_priority = v.priority;
      await window.api.setResidentVacation(resident.res_id, 
        week_start,
        vacation_priority,
      );
    }

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
        style={{ display: "flex", flexDirection: "column", gap: "12px", maxWidth: "800px" }}
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

        
        {/* Vacation Weeks Section */}
        <h3>Vacation Weeks</h3>
        <div style={{ display: "flex", gap: "6px", fontWeight: "bold" }}>
          {/* <span style={{ width: "170px", textAlign: "center" }}>Vacation Name</span> */}
          <span style={{ width: "150px", textAlign: "center" }}>Start Week</span>
          <span style={{ width: "150px", textAlign: "center" }}>End Week</span>
          <span style={{ width: "100px", textAlign: "center" }}>Priority</span>
        </div>

        {vacationWeeks.map((v, index) => (
          <div key={index} style={{ display: "flex", gap: "6px", marginBottom: "8px" }}>
            {/* Vacation Name */}
            {/* <input
              type="text"
              placeholder="Vacation Name"
              value={v.name || ""}
              onChange={(e) => handleVacationChange(index, "name", e.target.value)}
              style={{ padding: "8px", flex: 1 }}
            /> */}
            <input
              type="date"
              value={v.start || ""}
              onChange={(e) => handleVacationChange(index, "start", e.target.value)}
              style={{ padding: "8px", width: "150px" }}
            />
            <input
              type="date"
              value={v.end || ""}
              onChange={(e) => handleVacationChange(index, "end", e.target.value)}
              style={{ padding: "8px", width: "150px" }}
            />
            <select
              value={v.priority}
              onChange={(e) => handleVacationChange(index, "priority", Number(e.target.value))}
              style={{ padding: "8px", width: "120px" }}
            >
              <option value={1}>High</option>
              <option value={2}>Medium</option>
              <option value={3}>Low</option>
            </select>
          </div>
        ))}

        <button
          type="button"
          onClick={handleAddVacation}
          style={{
            padding: "6px 10px",
            borderRadius: "4px",
            backgroundColor: "#375497",
            color: "white",
            border: "none",
            cursor: "pointer",
          }}
        >
          + Add Another
        </button>


        {/* Starting Service Section */}
        <label>
          Starting Service:
          <select
            value={startingService}
            onChange={(e) => setStartingService(e.target.value)}
            style={{ padding: "8px", width: "100%" }}
          >
            <option value="">-- Select Service --</option>
            {services.map((s) => (
            <option key={s.service_id} value={s.name}>
              {s.name}
            </option>
          ))}
          </select>
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
