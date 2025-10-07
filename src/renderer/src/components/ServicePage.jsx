import React, {useState} from "react";
import { Link } from "react-router-dom";

// *IMPORTANT* this code here is mostly copied from resident page

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

//this was originally just called Service instead of ServicePage, no idea how it was working
export default function ServicePage() {

  //making services manually here, link to database
  const [services, setServices]=useState([
    {id:1, name: "Service A", isDeleted: false},
    {id:2, name: "Service B", isDeleted: false},
    {id:3, name: "Service C", isDeleted: false},

  ]);

  const [showDeleteConfirm, setShowDeleteConfirm] =useState(false);

  const [serviceToDelete,setServiceToDelete] = useState(null);

  const handleDeleteClick = (service) =>{
    setServiceToDelete(service);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete=()=>{
    if(serviceToDelete){
      setServices(prevServices=>
        prevServices.map(service=>
            service.id===serviceToDelete.id
              ? {...service, isDeleted: true}
              : service
        )
      )
    }

    setShowDeleteConfirm(false);
    setServiceToDelete(null);
  };

  const handleCancelDelete = ()=>{
    setShowDeleteConfirm(false);
    setServiceToDelete(null);
  };

  const activeServices = services.filter(service => !service.isDeleted);
  const deletedServices = services.filter(service => service.isDeleted);

  return (
    <div style={{ padding: "16px" }}>
      {/* Back to Home */}
      <Link to="/" style={{ textDecoration: "none" }}>
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
          Back to Home
        </button>
      </Link>

       <div style={{ marginBottom: "16px" }}>
        <h2 style={{ fontSize: "24px", fontWeight: "bold", margin: 0 }}>
          SERVICE MAIN PAGE
        </h2>

        <Link to="/adds" style={{ textDecoration: "none" }}><button style={buttonStyle}>ADD</button></Link>
    </div>
    {/* deleted services section */}
    {deletedServices.length >0 && (
        <div style ={{ position: "fixed",top:400, padding: "16px", backgroundColor: "#f5f5f5", borderRadius: "4px"}}>
          <h3 style={{color:"#666", marginBottom: "12px" }}>Deleted Services</h3>
          <div style={{display: "flex", flexDirection: "column", gap: "12px" }}>{deletedServices.map(service => (
            <div key={service.id} style = {{display: "flex", gap: "8px", alignItems: "center"}}>
              <span style ={{ color:"#999", textDecoration: "line-through" }}>
                {service.name}:
              </span>
              <span style = {{color: "#999", fontStyle: "italic"}}>Deleted</span>
              </div>
          ))}
          </div>
          </div>
      )}

        {/* active services */}
      <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom:"24px" }}>
        {activeServices.map(service => (
          <div key={service.id} style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <span>{service.name}:</span>
            <button style={buttonStyle}>EDIT</button>
            <button 
              style={deleteButtonStyle}
              onClick={() => handleDeleteClick(service)}
            >
              DELETE
            </button>
            <button style={buttonStyle}>VIEW</button>
          </div>
        ))}
      </div>

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
                Are you sure you want to delete {serviceToDelete?.name}? This can be undone later.
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
