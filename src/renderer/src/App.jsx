function App() {
  // Dummy data
  const residents = [
    "Resident 1",
    "Resident 2",
    "Resident 3",
    "Resident 4",
    "Resident 5",
    "Resident 6",
    "Resident 7",
    "Resident 8",
    "Resident 9",
    "Resident 10",
  ];

  // Generate job columns
  const jobColumns = Array.from({ length: 52 }, (_, i) => `Job ${i + 1}`);

  return (
    <div style={{ textAlign: "center", marginTop: "20px", fontSize: "14px", overflowX: "auto" }}>
      <table
        style={{
          borderCollapse: "collapse",
          margin: "0 auto",
          minWidth: "1000px",
        }}
      >
        <thead>
          <tr>
            <th style={{ border: "1px solid black", padding: "4px" }}>Resident</th>
            {jobColumns.map((job) => (
              <th key={job} style={{ border: "1px solid black", padding: "4px" }}>
                {job}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {residents.map((resident, rowIndex) => (
            <tr key={rowIndex}>
              <td style={{ border: "1px solid black", padding: "4px" }}>{resident}</td>
              {jobColumns.map((_, colIndex) => (
                <td key={colIndex} style={{ border: "1px solid black", padding: "4px" }}>
                  {/* Empty for now; you can fill with job data */}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default App;