import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";

export default function EditS() {
  const { service_id } = useParams();
  const navigate = useNavigate();
  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  // Loads service data
  useEffect(() => {
    const fetchService = async () => {
      try {
        const allServices = await window.api.getServices(false);
        const found = allServices.find((s) => s.service_id === Number(service_id));
        if (found) {
          setService(found);
          setName(found.name);
          setDescription(found.description || "");
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

  // Handles form submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Cals update function
      await window.api.updateService(service.service_id, name, description);
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

      <h2>Edit Service</h2>
      <p>
        <strong>Editing:</strong> {service.name}
      </p>

      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", flexDirection: "column", gap: "12px", maxWidth: "400px" }}
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
