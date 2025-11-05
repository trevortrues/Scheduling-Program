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

export default function ResidentPage() {
  const [residents, setResidents] = useState([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [residentToDelete, setResidentToDelete] = useState(null);
  const navigate = useNavigate();

  //load residents from database on page load
  useEffect(() => {
    const fetchResidents = async () => {
      try {
        const result = await window.api.getResidents(false);
        setResidents(result);
      } catch(err) {
        console.error("failed to fetch residents:", err);
      }
    };

    fetchResidents();
  }, []);

  const handleDeleteClick = (resident) => {
    setResidentToDelete(resident);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (residentToDelete) {
      try {
        await window.api.updateResident(residentToDelete.res_id, { is_active: 0 });        
        setResidents((prev) =>
          prev.map((r) =>
            r.res_id === residentToDelete.res_id ? { ...r, is_active: 0 } : r
          )
        );
      } catch(err) {
        console.error("error DELETING resident:", err);
      }
    }
    setShowDeleteConfirm(false);
    setResidentToDelete(null);
    };

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
    setResidentToDelete(null);
  };

  const handleEditClick = (res_id) => {
    navigate(`/editr/${res_id}`);
  };

  const activeResidents = residents.filter((r) => r.is_active === 1);

  return (
    <div style={{ padding: "16px" }}>
      <Link to="/" style={{ textDecoration: "none" }}>
        <button
            style={{
            padding: "8px 12px",
            borderRadius: "4px",
            backgroundColor: "#010612ff",
            color: "white",
            border: "none",
            cursor: "pointer",
            marginBottom: "16px",
          }}
        >
          Back to Home
        </button>
      </Link>

      <div
        style={{
          marginBottom: "16px",
          display: "flex",
          gap: "12px",
          alignItems: "center",
        }} >

        <h2 style={{ fontSize: "24px", fontWeight: "bold", margin: 0 }}>
          RESIDENT MAIN PAGE
        </h2>

        <Link to="/addr" style={{ textDecoration: "none" }}>
          <button style={buttonStyle}>ADD</button>
        </Link>

        <Link to="/deletedresidents" style={{ textDecoration: "none" }}>
          <button style={{ ...buttonStyle, backgroundColor: "#555" }}>
            DELETED RESIDENTS
          </button>
        </Link>
      </div>

      {/* Active Residents */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          marginBottom: "24px",
        }}
      >
        {activeResidents.map((resident) => (
          <div
            key={resident.resident_id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "8px 0",
              borderBottom: "1px solid #ddd",
            }}
          >
            {/* Fixed-width name column */}
            <span style={{ width: "250px", fontWeight: "500" }}>
              {resident.first_name} {resident.last_name}
            </span>

            {/* Buttons area */}
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                style={buttonStyle}
                onClick={() => handleEditClick(resident.res_id)}
              >
                EDIT
              </button>

              <button
                style={deleteButtonStyle}
                onClick={() => handleDeleteClick(resident)}
              >
                DELETE
              </button>

              <button style={buttonStyle}>VIEW</button>
            </div>
          </div>
        ))}

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
              Are you sure you want to delete{" "}
              {residentToDelete
                ? residentToDelete?.first_name +
                  " " +
                  residentToDelete.last_name
                : ""}
              ? This can be undone later.
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
