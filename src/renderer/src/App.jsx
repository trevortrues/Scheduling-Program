import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import HomePage from "./components/HomePage";
import ScheduleTable from "./components/ScheduleTable";

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/schedule" element={<ScheduleTable />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;