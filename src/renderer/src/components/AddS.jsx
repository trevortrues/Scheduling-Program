import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

export default function AddS() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const navigate = useNavigate();
  const [type, setType] = useState("Outpatient");

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await window.api.addService(name, description);
      alert("Service added successfully!");
      navigate("/service");
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

      <h2>Add Service</h2>

      <form
        onSubmit={handleSubmit}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          maxWidth: "400px",
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
            rows="3"
            style={{ padding: "8px", width: "100%" }}
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
          Save Service
        </button>
      </form>
    </div>
  );
}
