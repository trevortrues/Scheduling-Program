import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";

export default function EditS() {
  const { service_id } = useParams();
  const navigate = useNavigate();
  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("Outpatient");

  const [allServices, setAllServices] = useState([]);
  const [incompatibleServices, setIncompatibleServices] = useState([]);

  //  NEW STATES
  const [rotationLength, setRotationLength] = useState(""); // weeks or days?
  const [requiredOnHolidays, setRequiredOnHolidays] = useState(false);
  const [residentCounts, setResidentCounts] = useState({
    PGY1: { min: "", max: "" },
    PGY2: { min: "", max: "" }, 
    PGY3: { min: "", max: "" }, //do we need more of these?
  });

  // Loads service data
  useEffect(() => {
    const fetchService = async () => {
      try {
        const all = await window.api.getServices(false);
        setAllServices(all);

        const found = all.find((s) => s.service_id === Number(service_id));
        if (found) {
          setService(found);
          setName(found.name);
          setDescription(found.description || "");
          setType(found.type || "Outpatient");
          setIncompatibleServices(found.incompatible_services || []);

          // Loads new fields if they exist in DB
          setRotationLength(found.rotation_length || "");
          setRequiredOnHolidays(found.required_on_holidays || false);
          setResidentCounts(
            found.resident_counts || {
              PGY1: { min: "", max: "" },
              PGY2: { min: "", max: "" },
              PGY3: { min: "", max: "" },
            }
          );
        }
      } catch (err) {
        console.error("Failed to load service:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchService();
  }, [service_id]);

  if (loading) return <p>Loading service data...</p>;
  if (!service) return <p>Service not found.</p>;

  const handleToggleIncompatible = (id) => {
    setIncompatibleServices((prev) =>
      prev.includes(id)
        ? prev.filter((s) => s !== id)
        : [...prev, id]
    );
  };

  // handles resident count changes
  const handleResidentCountChange = (pgy, field, value) => {
    setResidentCounts((prev) => ({
      ...prev,
      [pgy]: { ...prev[pgy], [field]: value },
    }));
  };

  // Handles form submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const updates = {
        name,
        description,
        type,
        incompatible_services: incompatibleServices,
        rotation_length: rotationLength,
        required_on_holidays: requiredOnHolidays,
        resident_counts: residentCounts,
      };

      await window.api.updateService(service.service_id, updates);
      alert("Service updated successfully!");
      navigate("/service");
    } catch (err) {
      console.error("Failed to update service:", err);
      alert("Error updating service.");
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
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "16px",
          maxWidth: "800px",
         
        }}
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

        {/* Rotation length */}
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

        {/* Required on holidays? */}
        <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <input
            type="checkbox"
            checked={requiredOnHolidays}
            onChange={(e) => setRequiredOnHolidays(e.target.checked)}
          />
          Required on Holiday Weeks
        </label>

        {/*  Resident min/max per their PGY */}
        <div style={{ borderTop: "1px solid #ccc", paddingTop: "8px" }}>
          <label style={{ fontWeight: "bold" }}>Resident Numbers per PGY Level:</label>
          {["PGY1", "PGY2", "PGY3"].map((level) => (
            <div key={level} style={{ marginTop: "8px" }}>
              <strong>{level}</strong>
              <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
                <input
                  type="number"
                  value={residentCounts[level].min}
                  onChange={(e) =>
                    handleResidentCountChange(level, "min", e.target.value)
                  }
                  placeholder="Min"
                  style={{ padding: "6px", width: "100%" }}
                />
                <input
                  type="number"
                  value={residentCounts[level].max}
                  onChange={(e) =>
                    handleResidentCountChange(level, "max", e.target.value)
                  }
                  placeholder="Max"
                  style={{ padding: "6px", width: "100%" }}
                />
              </div>
            </div>
          ))}
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
            {allServices
              .filter((s) => s.service_id !== Number(service_id))
              .map((s) => (
                <label
                  key={s.service_id}
                  style={{
                    display: "block",
                    marginBottom: "4px",
                  }}
                >
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
          Save Changes
        </button>
      </form>
    </div>
  );
}
