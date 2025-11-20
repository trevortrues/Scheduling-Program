import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";

export default function SerSumm() {
  const { service_id } = useParams();
  const [service, setService] = useState(null);
  const [allServices, setAllServices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchService = async () => {
      try {
        const services = await window.api.getServices(false);
        setAllServices(services);
        const found = services.find((s) => s.service_id === Number(service_id));
        if (found) setService(found);
      } catch (err) {
        console.error("Failed to load service:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchService();
  }, [service_id]);

  if (loading) return <p>Loading service summary...</p>;
  if (!service) return <p>Service not found.</p>;

  // get names of incompatible services
  const incompatibleNames = service.incompatible_services
    ? service.incompatible_services
        .map((id) => allServices.find((s) => s.service_id === id)?.name)
        .filter(Boolean)
    : [];

  return (
    <div>
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

      <h2 style={{ marginBottom: "12px" }}>
        Service Summary: {service.name}
      </h2>

      <p><strong>Description:</strong> {service.description || "N/A"}</p>
      <p><strong>Type:</strong> {service.type}</p>
      <p><strong>Rotation Length:</strong> {service.rotation_length || "N/A"} weeks</p>
      <p><strong>Required on Holidays:</strong> {service.required_on_holidays ? "Yes" : "No"}</p>

      <hr style={{ margin: "16px 0" }} />

      <h3>Resident Counts</h3>
      {service.resident_counts ? (
        <ul>
          {Object.entries(service.resident_counts).map(([level, counts]) => (
            <li key={level}>
              <strong>{level}:</strong> Min {counts.min || "?"}, Max {counts.max || "?"}
            </li>
          ))}
        </ul>
      ) : (
        <p>No resident count data available.</p>
      )}

      <hr style={{ margin: "16px 0" }} />

      <h3>Incompatible Services</h3>
      {incompatibleNames.length > 0 ? (
        <ul>
          {incompatibleNames.map((name, i) => (
            <li key={i}>{name}</li>
          ))}
        </ul>
      ) : (
        <p>No incompatible services listed.</p>
      )}
    </div>
  );
}
