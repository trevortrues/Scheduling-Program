import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";

const buttonStyle = {
  padding: "8px 12px",
  borderRadius: "4px",
  backgroundColor: "#375497ff",
  color: "white",
  border: "none",
  cursor: "pointer",
};

const deleteButtonStyle = {
  ...buttonStyle,
  backgroundColor: "#d32f2f",
};

export default function ServicePage() {
  const [services, setServices] = useState([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [serviceToDelete, setServiceToDelete] = useState(null);
  const navigate = useNavigate();
  const [types, setTypes] = useState({});

  // retrieves services from database on page load
  useEffect(() => {
    const fetchServices = async () => {
      try{
        const result = await window.api.getServices(false);
        setServices(result);
      } catch(err) {
        console.error("failed to fetch services", err);
      }
    };
    fetchServices();
  },[]);

  const handleDeleteClick = (service) =>{
    setServiceToDelete(service);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if(serviceToDelete){
      try{
        await window.api.updateService(serviceToDelete.service_id, { is_active: 0 });
        setServices((prev) =>
          prev.map((s) =>
            s.service_id === serviceToDelete.service_id
              ? { ...s, is_active: 0 }
              : s
          )
        );
      } catch (err) {
        console.error("error DELETING service:", err);
      }
    }
    setShowDeleteConfirm(false);
    setServiceToDelete(null);
   };

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
    setServiceToDelete(null);
   };

  const handleRestore = async (service) => {
    try {
      await window.api.updateService(service.service_id, { is_active: 1 });
      setServices((prev) =>
        prev.map((s) =>
          s.service_id === service.service_id ? { ...s, is_active: 1 } : s
        )
      );
    } catch (err) {
      console.error("Error restoring service:", err);
    }
  };

  
  const handleEditClick = (service) => {
    navigate(`/editser/${service.service_id}`);
  };

  const activeServices = services.filter((s) => s.is_active === 1);

  return (
    <div style={{ padding: "16px" }}>
      <Link to="/" style={{ textDecoration: "none" }}>
        <button
          style={{
            ...buttonStyle,
            backgroundColor: "#090101ff",
            marginBottom: "16px",
          }}
        >
          Back to Home
        </button>
      </Link>

      <div style={{ display: "flex", alignItems: "center", marginBottom: "16px" }}>
      <h2 style={{ fontSize: "24px", fontWeight: "bold", marginRight: "20px" }}>
        SERVICE MAIN PAGE
      </h2>

      <Link to="/adds" style={{ textDecoration: "none", marginRight: "10px" }}>
        <button style={buttonStyle}>ADD</button>
      </Link>

      <Link to="/deletedservices" style={{ textDecoration: "none" }}>
        <button style={{ ...buttonStyle, backgroundColor: "#585454ff" }}>
          DELETED SERVICES
        </button>
      </Link>
    </div>


      {/* Active services */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          marginTop: "14px",
        }}
      >

        {activeServices.map((service) => {
        //PLEASE fix this when doing DB/ middle where so it changes depending on which is clicked for now its hard coded 
       const serviceType = types[service.service_id] || service.type || "Outpatient";

        return (
          <div
            key={service.service_id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "8px 0",
              borderBottom: "1px solid #ddd",
            }} >

            <span style={{ width: "200px", fontWeight: "500" }}>
              {service.name} </span>

            <span
              style={{
                width: "120px",
                fontStyle: "italic",
                color: "#333",
              }}
            > {serviceType}  </span>

            <button
              style={buttonStyle}
              onClick={() => handleEditClick(service)}
            > EDIT </button>

            <button
              style={deleteButtonStyle}
              onClick={() => handleDeleteClick(service)}
            > DELETE </button>

            <button style={buttonStyle}>VIEW</button>
          </div>
        );
      })}

      </div>

      {showDeleteConfirm && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: "white",
              padding: "24px",
              borderRadius: "8px",
              boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
              minWidth: "300px",
            }}
          >
            <h3 style={{ marginTop: 0, marginBottom: "16px" }}>
              Confirm Delete
            </h3>
            <p style={{ marginBottom: "24px" }}>
              Are you sure you want to delete {serviceToDelete?.name}? This can
              be undone later.
            </p>
            <div
              style={{
                display: "flex",
                gap: "12px",
                justifyContent: "flex-end",
              }}
            >
              <button
                onClick={handleCancelDelete}
                style={{
                  padding: "8px 16px",
                  borderRadius: "4px",
                  backgroundColor: "#6c757d",
                  color: "white",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                style={{
                  padding: "8px 16px",
                  borderRadius: "4px",
                  backgroundColor: "#d32f2f",
                  color: "white",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
