import React, {useState} from "react";
import { Link } from "react-router-dom";


const buttonStyle = {
  padding: "8px 12px",
  borderRadius: "4px",
  backgroundColor: "#011b58ff",
  color: "white",
  border: "none",
  cursor: "pointer",
};

const deleteButtonStyle = {
  ...buttonStyle,
  backgroundColor: "#d32f2f",
};

//note: residents are currently being generated manually on opening the resident page. this can be changed later

export default function ResidentPage() {

  //making residents here, need to link it to database
  const [residents,setResidents]=useState([
    {id:1, name: "Resident 1", isDeleted: false},
    {id:2, name: "Resident 2", isDeleted: false},
    {id:3, name: "Resident 3", isDeleted: false},
  ]);

  //controlling visibility of delete confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] =useState(false);
  //store which resident is going to be deleted
  const [residentToDelete, setResidentToDelete] = useState(null);

  //handle delete button clicked
  //assign resident to be deleted and show confirm
  const handleDeleteClick = (resident) => {
    setResidentToDelete(resident);
    setShowDeleteConfirm(true);
  };

  //handle delete confirmed
  //update resident isDeleted to true and hides confirm
  const handleConfirmDelete = () => {
    if(residentToDelete){
      setResidents(prevResidents=>
        prevResidents.map(resident=>
          resident.id===residentToDelete.id
            ? { ...resident, isDeleted: true} //deleted
            : resident
        )
      )
    }
    //reset confirm
    setShowDeleteConfirm(false);
    setResidentToDelete(null);
  };

  //handle deleted cancelled
  //hide confirm
  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
    setResidentToDelete(null);
  };

  //filter residents on isDeleted
  const activeResidents = residents.filter(resident => !resident.isDeleted);
  const deletedResidents = residents.filter(resident => resident.isDeleted);

  return (
    <div style={{ padding: "16px" }}>
      {/* Back to Home Button */}
      <Link to="/" style={{ textDecoration: "none" }}>
        <button
            style={{
            padding: "8px 12px",
            borderRadius: "4px",
            backgroundColor: "#375497ff",
            color: "white",
            border: "none",
            cursor: "pointer",
            marginBottom: "16px",
          }}
        >
          Back to Home
        </button>
      </Link>
        
      <div style={{ marginBottom: "16px" }}>
        <h2 style={{ fontSize: "24px", fontWeight: "bold", margin: 0 }}>
          RESIDENT MAIN PAGE
        </h2>
      </div>
          {/* create the deleted residents section, need a few more guidelines and customizations for this one*/}
      {deletedResidents.length >0 && (
        <div style ={{ position: "fixed",top:400, padding: "16px", backgroundColor: "#f5f5f5", borderRadius: "4px"}}>
          <h3 style={{color:"#666", marginBottom: "12px" }}>Deleted Residents</h3>
          <div style={{display: "flex", flexDirection: "column", gap: "12px" }}>{deletedResidents.map(resident => (
            <div key={resident.id} style = {{display: "flex", gap: "8px", alignItems: "center"}}>
              <span style ={{ color:"#999", textDecoration: "line-through" }}>
                {resident.name}:
              </span>
              <span style = {{color: "#999", fontStyle: "italic"}}>Deleted</span>
              </div>
          ))}
          </div>
          </div>
      )}

        
          {/* Active Residents */}
      <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom:"24px" }}>
        {activeResidents.map(resident => (
          <div key={resident.id} style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <span>{resident.name}:</span>
            <button style={buttonStyle}>EDIT</button>
            <button 
              style={deleteButtonStyle}
              onClick={() => handleDeleteClick(resident)}
            >
              DELETE
            </button>
            <button style={buttonStyle}>VIEW</button>
          </div>
        ))}
      </div>
        {/* this is the delete confirm*/}
        {showDeleteConfirm && (
          <div style ={{
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
          }}>
            <div style={{
              backgroundColor: "white",
              padding: "24px",
              borderRadius: "8px",
              boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
              minWidth: "300px",
            }}>
              <h3 style={{marginTop: 0, marginBottom: "16px" }}>
                Confirm Delete
              </h3>
              <p style = {{marginBottom: "24px" }}>
                Are you sure you want to delete {residentToDelete?.name}? This can be undone later.
                </p>
              <div style ={{display:"flex",gap:"12px", justifyContent: "flex-end"}}>
                <button onClick={handleCancelDelete}
                        style ={{
                          padding: "8px 16px",
                          borderRadius: "4px",
                          backgroundColor: "#6c757d",
                          color:"white",
                          border:"none",
                          cursor:"pointer",
                        }}
                        >Cancel
                        </button>
                <button
                  onClick={handleConfirmDelete}
                  style={{
                    padding:"8px 16px",
                    borderRadius: "4px",
                    backgroundColor:"#d32f2f",
                    color:"white",
                    border:"none",
                    cursor:"pointer",
                  }}>
                    Confirm Delete
                  </button>
              </div>
              </div>
            </div>
        )}

      </div>
  );
}
