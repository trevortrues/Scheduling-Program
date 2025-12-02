import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

export default function AddS() {
  const navigate = useNavigate();

  // Form fields
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("Outpatient");
  const [rotationLength, setRotationLength] = useState("");
  const [requiredOnHolidays, setRequiredOnHolidays] = useState(false);
  const [residentCounts, setResidentCounts] = useState({
      PGY1: { min: "", max: "" },
      PGY2: { min: "", max: "" },
      PGY3: { min: "", max: "" },
      resident_per_week: { min: "", max: "" }
  });
  const [allServices, setAllServices] = useState([]);
  const [incompatibleServices, setIncompatibleServices] = useState([]);

  // Load all services for "Incompatible with"
  useEffect(() => {
    const fetchServices = async () => {
      try {
        const all = await window.api.getServices(false);
        setAllServices(all);
      } catch (err) {
        console.error("Failed to load services:", err);
      }
    };
    fetchServices();
  }, []);

  // Toggle incompatible service selection
  const handleToggleIncompatible = (id) => {
    setIncompatibleServices((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  // Update PGY min/max
  const handleResidentCountChange = (pgy, field, value) => {
    setResidentCounts((prev) => ({
      ...prev,
      [pgy]: { ...prev[pgy], [field]: value },
    }));
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Build service object
    const newService = {
      name,
      description,
      type,
      rotation_length: rotationLength,
      required_on_holidays: requiredOnHolidays,
      resident_counts: residentCounts,
      incompatible_services: incompatibleServices,
    };

    try {
      // Call backend addService
      await window.api.addService(newService);

      alert("Service added successfully!");
    } catch (err) {
      console.error("Failed to add service:", err);
      alert("Error adding service.");
    }
  };

  return (
    <div style={{ padding: "16px" }}>
      <Link to="/service" style={{ textDecoration: "none" }}>
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
          Back to Services
        </button>
      </Link>

      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", flexDirection: "column", gap: "16px", maxWidth: "800px" }}
      >
        <label>
          Service Name:
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            style={{ padding: "8px", width: "100%" }}
          />
        </label>

        <label>
          Description:
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enter a short description..."
            rows={4}
            style={{ padding: "8px", width: "100%", resize: "vertical" }}
          />
        </label>

        <label>
          Type:
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            style={{ padding: "8px", width: "100%" }}
          >
            <option value="Inpatient">Inpatient</option>
            <option value="Outpatient">Outpatient</option>
          </select>
        </label>

        <label>
          Rotation Length (weeks):
          <input
            type="number"
            value={rotationLength}
            onChange={(e) => setRotationLength(e.target.value)}
            placeholder="e.g. 4"
            style={{ padding: "8px", width: "100%" }}
          />
        </label>

        <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <input
            type="checkbox"
            checked={requiredOnHolidays}
            onChange={(e) => setRequiredOnHolidays(e.target.checked)}
          />
          Required on Holiday Weeks
        </label>

        {/* Resident Counts */}
          <label style={{ fontWeight: "bold" }}>Weeks required per PGY level for the year</label>
                    {["PGY1", "PGY2", "PGY3"].map((level) => (
            <div key={level} style={{ marginTop: "8px" }}>
              <strong>{level}</strong>
              <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
                <input
                  type="number"
                  value={residentCounts[level].min}
                  onChange={(e) => handleResidentCountChange(level, "min", e.target.value)}
                  placeholder="Min"
                  style={{ padding: "6px", width: "100%" }}
                />
                <input
                  type="number"
                  value={residentCounts[level].max}
                  onChange={(e) => handleResidentCountChange(level, "max", e.target.value)}
                  placeholder="Max"
                  style={{ padding: "6px", width: "100%" }}
                />

              </div>
            </div>
          ))}

          {/* Residents Needed Per Week */}
          <div style={{ marginTop: "16px" }}>
            <strong>Residents Needed Per Week</strong>
            <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
              <input
                type="number"
                value={residentCounts.resident_per_week.min}
                onChange={(e) =>
                  handleResidentCountChange("resident_per_week", "min", e.target.value)
                }
                placeholder="Min"
                style={{ padding: "6px", width: "100%" }}
              />
              <input
                type="number"
                value={residentCounts.resident_per_week.max}
                onChange={(e) =>
                  handleResidentCountChange("resident_per_week", "max", e.target.value)
                }
                placeholder="Max"
                style={{ padding: "6px", width: "100%" }}
              />
            </div>
          </div>

        {/* Incompatible Services */}
        <div>
          <label style={{ fontWeight: "bold" }}>Incompatible with:</label>
          <div
            style={{
              border: "1px solid #ccc",
              borderRadius: "4px",
              padding: "8px",
              maxHeight: "200px",
              overflowY: "auto",
            }}
          >
            {allServices.map((s) => (
              <label key={s.service_id} style={{ display: "block", marginBottom: "4px" }}>
                <input
                  type="checkbox"
                  checked={incompatibleServices.includes(s.service_id)}
                  onChange={() => handleToggleIncompatible(s.service_id)}
                />{" "}
                {s.name} ({s.type})
              </label>
            ))}
          </div>
        </div>

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
          Add Service
        </button>
      </form>
    </div>
  );
}