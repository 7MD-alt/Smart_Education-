import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./index.css";

import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./router/ProtectedRoute";

import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/auth/LoginPage";
import AdminDashboard from "./pages/admin/AdminDashboard";
import TeacherDashboard from "./pages/teacher/TeacherDashboard";
import StudentDashboard from "./pages/student/StudentDashboard";
import TeacherMaterialsPage from "./pages/teacher/TeacherMaterialsPage";
import ScanAttendance from "./pages/teacher/ScanAttendance";
import DangerZonePage from "./pages/teacher/DangerZonePage";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />

          <Route
            path="/admin"
            element={
              <ProtectedRoute role="ADMIN">
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/teacher"
            element={
              <ProtectedRoute role="TEACHER">
                <TeacherDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/teacher/scan"
            element={
              <ProtectedRoute role="TEACHER">
                <ScanAttendance />
              </ProtectedRoute>
            }
          />

          <Route
            path="/teacher/courses/:courseId/materials"
            element={
              <ProtectedRoute role="TEACHER">
                <TeacherMaterialsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/teacher/courses/:courseId/danger-zone"
            element={
              <ProtectedRoute role="TEACHER">
                <DangerZonePage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/student"
            element={
              <ProtectedRoute role="STUDENT">
                <StudentDashboard />
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </React.StrictMode>
);