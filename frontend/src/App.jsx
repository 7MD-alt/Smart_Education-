import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import StudentDashboard from './pages/StudentDashboard';
import TeacherDashboard from './pages/TeacherDashboard'; // Added for the Professor portal
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 1. The Startup Landing Page */}
        <Route path="/" element={<LandingPage />} />
        
        {/* 2. The Shared Login Page */}
        <Route path="/login" element={<LoginPage />} />
        
        {/* 3. The Student Portal (Attendance & Profile) */}
        <Route path="/student-dashboard" element={<StudentDashboard />} /> 
        
        {/* 4. The Teacher Portal (AI Session Control) */}
        <Route path="/teacher-dashboard" element={<TeacherDashboard />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;