import React, { useState, useEffect } from "react"; 
import { Link, useNavigate } from "react-router-dom";

export default function AddR() {
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [pgyLevel, setPgyLevel] = useState("");

  // NEWish: Vacation fields
  const [vacationDays, setVacationDays] = useState([{ name: "", startDay: "", endDay: "", priority: "1" }]);

  // NEWish: Starting service dropdown
  const [startingService, setStartingService] = useState("");
  const [services, setServices] = useState([]); // <-- fetch services from DB

  // NEWish: fetch services from DB
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


  const handleVacationChange = (index, field, value) => {
  const updated = [...vacationDays];
  updated[index][field] = value;
  setVacationDays(updated);
  };


  const handleAddVacation = () => {
    setVacationDays([...vacationDays, { name: "", day: "", priority: "1" }]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      //now includes vacationDays and startingService
      await window.api.addResident(firstName, lastName, pgyLevel, {
        vacationDays,
        startingService,
      });

      alert("Resident added successfully!");
      navigate("/resident");
    } catch (err) {
      console.error("Failed to add resident:", err);
      alert("Error adding resident.");
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

      <h2>Add Resident</h2>

      <form
        onSubmit={handleSubmit}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          maxWidth: "800px",
        }}
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

        {/*Vacation Days Section */}

          {/* Column headers */}
          <div style={{ display: "flex", gap: "6px", marginBottom: "0px", fontWeight: "bold"}}>
            <span style={{ width: "170px", textAlign: "center" }}>Vacation Name</span>
            <span style={{ width: "120px", textAlign: "center" }}>Start Date</span>
            <span style={{ width: "160px", textAlign: "center" }}>End Date</span>
            <span style={{ width: "100px", textAlign: "center" }}>Priority</span>
          </div>

          {vacationDays.map((v, index) => (
            <div key={index} style={{ display: "flex", gap: "6px", marginBottom: "8px", width: "80px"}}>
              {/* Vacation Name */}
              <input
                type="text"
                placeholder="Vacation Name"
                value={v.name || ""}
                onChange={(e) => handleVacationChange(index, "name", e.target.value)}
                style={{ padding: "8px", flex: 1 }}
              />

              {/* Vacation Date */}
              <input
                type="date"
                value={v.day || ""}
                onChange={(e) => handleVacationChange(index, "day", e.target.value)}
                style={{ padding: "8px", width: "150px" }}
              />

               {/* End Date */}
                <input
                  type="date"
                  value={v.endDay || ""}
                  onChange={(e) => handleVacationChange(index, "endDay", e.target.value)}
                  style={{ padding: "8px", width: "150px" }}
                />

              {/* Priority */}
              <select
                value={v.priority}
                onChange={(e) => handleVacationChange(index, "priority", e.target.value)}
                style={{ padding: "8px", width: "140px" }}
              >
                <option value="1">High</option>
                <option value="2">Meduim</option>
                <option value="3">Low</option>
              </select>

               <button
                type="button"
                onClick={() => {
                  setVacationDays(vacationDays.filter((_, i) => i !== index));
                }}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "20px",
                  padding: "0 6px"
                }}
              >
                🗑️
              </button>
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
          Add Resident
        </button>
      </form>
    </div>
  );
}
