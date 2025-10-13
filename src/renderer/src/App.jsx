import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import HomePage from "./components/HomePage";
import ScheduleTable from "./components/ScheduleTable";
import ServicePage from "./components/ServicePage";
import ResidentPage from "./components/ResidentPage";
import HistPage from "./components/HistPage";
import EditR from "./components/EditR";
import EditS from "./components/EditS";
import AddR from "./components/AddR";
import AddS from "./components/AddS";
import DeletedResidents from "./components/DeletedResidents";


function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/schedule" element={<ScheduleTable />} />
          <Route path="/service" element={<ServicePage />} />
          <Route path="/resident" element={<ResidentPage />} />
          <Route path="/history" element={<HistPage />} />
          <Route path="/editres" element={<EditR />} />
          <Route path="/editser" element={<EditS />} />
          <Route path="/adds" element={<AddS />} />
          <Route path="/addr" element={<AddR />} />
          <Route path="/deletedresidents" element={<DeletedResidents />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
