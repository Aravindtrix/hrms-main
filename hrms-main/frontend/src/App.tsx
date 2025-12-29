import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MainLayout from './components/ui/MainLayout';
import Dashboard from './pages/Dashboard/Dashboard';
import Recruitment from './pages/Recruitment/Recruitment';
import Candidates from './pages/Candidates/Candidates';
import HeadDashboard from './pages/Tickets/HeadDashboard';
import HeadMyTickets from './pages/Tickets/HeadMyTickets';
import HRDashboard from './pages/Tickets/HRDashboard';
import HRPerformance from './pages/Tickets/HRPerformance';
import HeadPerformance from './pages/Tickets/HeadPerformance';
import HRCandidateEntry from './pages/Candidates/HRCandidateEntry';
import HeadShortlisted from './pages/Candidates/HeadShortlisted';
import Training from './pages/Training/Training';
import Departments from './pages/Masters/Departments';
import Roles from './pages/Masters/Roles';
import Employees from './pages/Masters/Employees';
import Exit from './pages/Exit/Exit';

function App() {
  return (
    <BrowserRouter>
      <MainLayout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/recruitment" element={<Recruitment />} />
          <Route path="/candidates" element={<Candidates />} />
          <Route path="/tickets/head" element={<HeadDashboard />} />
          <Route path="/tickets/head/my" element={<HeadMyTickets />} />
          <Route path="/heads/performance" element={<HeadPerformance />} />
          <Route path="/tickets/hr" element={<HRDashboard />} />
          <Route path="/performance/hr" element={<HRPerformance />} />
          <Route path="/candidates/entry" element={<HRCandidateEntry />} />
          <Route path="/candidates/head/shortlisted" element={<HeadShortlisted />} />
          <Route path="/training" element={<Training />} />
          <Route path="/exit" element={<Exit />} />
          <Route path="/masters/departments" element={<Departments />} />
          <Route path="/masters/roles" element={<Roles />} />
          <Route path="/masters/employees" element={<Employees />} />
        </Routes>
      </MainLayout>
    </BrowserRouter>
  );
}

export default App;
