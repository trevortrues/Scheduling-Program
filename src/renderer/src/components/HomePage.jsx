import { Link } from "react-router-dom";


export default function HomePage() {
  return (
    <div style={{ padding: "40px", textAlign: "center" }}>
      <h1 style={{ fontSize: "2rem", fontWeight: "bold", marginBottom: "24px" }}>
        Residency Program Scheduler
      </h1>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: "16px",
          maxWidth: "300px",
          margin: "0 auto",
        }}
      >
        {/* links to Schedule Table */}
        <Link to="/schedule" style={{ textDecoration: "none" }}>
          <button
            style={{
              padding: "12px",
              borderRadius: "8px",
              backgroundColor: "#011b58ff",
              color: "white",
              border: "none",
              cursor: "pointer",
              fontSize: "1rem",
              width: "100%",
            }}
          >
            View Most Recent Schedule
          </button>
        </Link>

        <Link to="/resident">
        <button style={{
              padding: "12px",
              borderRadius: "8px",
              backgroundColor: "#013b58ff",
              color: "white",
              border: "none",
              cursor: "pointer",
              fontSize: "1rem",
              width: "100%",
            }}>Go to Resident Homepage</button>
            </Link>

        <Link to="/service">
        <button style={{
              padding: "12px",
              borderRadius: "8px",
              backgroundColor: "#015852ff",
              color: "white",
              border: "none",
              cursor: "pointer",
              fontSize: "1rem",
              width: "100%",
            }}>Go to Services Homepage</button>
        </Link>

        <button style={{
              padding: "12px",
              borderRadius: "8px",
              backgroundColor: "#01583cff",
              color: "white",
              border: "none",
              cursor: "pointer",
              fontSize: "1rem",
              width: "100%",
            }}>Generate New Schedule</button>

      </div>
    </div>
  );
}

const buttonStyle = {
  padding: "12px",
  borderRadius: "8px",
  backgroundColor: "#444",
  color: "white",
  border: "none",
  cursor: "pointer",
  fontSize: "1rem",
  width: "100%",
};
