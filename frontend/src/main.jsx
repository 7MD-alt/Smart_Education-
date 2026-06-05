import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./index.css";

import { AuthProvider } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";
import ProtectedRoute from "./router/ProtectedRoute";

import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/auth/LoginPage";

import AdminDashboard from "./pages/admin/AdminDashboard";
import UsersPage from "./pages/admin/UsersPage";
import DepartmentsPage from "./pages/admin/DepartmentsPage";
import FilieresPage from "./pages/admin/FilieresPage";
import CoursesPage from "./pages/admin/CoursesPage";
import AdminProfilePage from "./pages/admin/AdminProfilePage";
import FaceRequestsPage from "./pages/admin/FaceRequestsPage";

import TeacherDashboard from "./pages/teacher/TeacherDashboard";
import TeacherCoursesPage from "./pages/teacher/TeacherCoursesPage";
import TeacherMaterialsPage from "./pages/teacher/TeacherMaterialsPage";
import DangerZonePage from "./pages/teacher/DangerZonePage";
import TeacherProfilePage from "./pages/teacher/TeacherProfilePage";
import ManualAttendancePage from "./pages/teacher/ManualAttendancePage";
import SeancesPage from "./pages/teacher/SeancesPage";
import SeanceRosterPage from "./pages/teacher/SeanceRosterPage";

import StudentDashboard from "./pages/student/StudentDashboard";
import StudentProfilePage from "./pages/student/StudentProfilePage";
import StudentChatPage from "./pages/student/StudentChatPage";
import StudentAttendancePage from "./pages/student/StudentAttendancePage";
import StudentCourseMaterialsPage from "./pages/student/StudentCourseMaterialsPage";
import StudentSeancesPage from "./pages/student/StudentSeancesPage";
import NOVAAPage from "./pages/student/NOVAAPage";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            {/* Public */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />

            {/* Admin */}
            <Route path="/admin" element={<ProtectedRoute role="ADMIN"><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/users" element={<ProtectedRoute role="ADMIN"><UsersPage /></ProtectedRoute>} />
            <Route path="/admin/departments" element={<ProtectedRoute role="ADMIN"><DepartmentsPage /></ProtectedRoute>} />
            <Route path="/admin/filieres" element={<ProtectedRoute role="ADMIN"><FilieresPage /></ProtectedRoute>} />
            <Route path="/admin/courses" element={<ProtectedRoute role="ADMIN"><CoursesPage /></ProtectedRoute>} />
            <Route path="/admin/face-requests" element={<ProtectedRoute role="ADMIN"><FaceRequestsPage /></ProtectedRoute>} />
            <Route path="/admin/profile" element={<ProtectedRoute role="ADMIN"><AdminProfilePage /></ProtectedRoute>} />

            {/* Teacher */}
            <Route path="/teacher" element={<ProtectedRoute role="TEACHER"><TeacherDashboard /></ProtectedRoute>} />
            <Route path="/teacher/courses" element={<ProtectedRoute role="TEACHER"><TeacherCoursesPage /></ProtectedRoute>} />
            <Route path="/teacher/courses/:courseId/materials" element={<ProtectedRoute role="TEACHER"><TeacherMaterialsPage /></ProtectedRoute>} />
            <Route path="/teacher/courses/:courseId/danger-zone" element={<ProtectedRoute role="TEACHER"><DangerZonePage /></ProtectedRoute>} />
            <Route path="/teacher/profile" element={<ProtectedRoute role="TEACHER"><TeacherProfilePage /></ProtectedRoute>} />
            <Route path="/teacher/courses/:courseId/attendance" element={<ProtectedRoute role="TEACHER"><ManualAttendancePage /></ProtectedRoute>} />
            <Route path="/teacher/courses/:courseId/seances" element={<ProtectedRoute role="TEACHER"><SeancesPage /></ProtectedRoute>} />
            <Route path="/teacher/seances/:seanceId/roster" element={<ProtectedRoute role="TEACHER"><SeanceRosterPage /></ProtectedRoute>} />

            {/* Student */}
            <Route path="/student" element={<ProtectedRoute role="STUDENT"><StudentDashboard /></ProtectedRoute>} />
            <Route path="/student/profile" element={<ProtectedRoute role="STUDENT"><StudentProfilePage /></ProtectedRoute>} />
            <Route path="/student/chat" element={<ProtectedRoute role="STUDENT"><StudentChatPage /></ProtectedRoute>} />
            <Route path="/student/attendance" element={<ProtectedRoute role="STUDENT"><StudentAttendancePage /></ProtectedRoute>} />
            <Route path="/student/courses/:courseId/attendance" element={<ProtectedRoute role="STUDENT"><StudentAttendancePage /></ProtectedRoute>} />
            <Route path="/student/courses/:courseId/materials" element={<ProtectedRoute role="STUDENT"><StudentCourseMaterialsPage /></ProtectedRoute>} />
            <Route path="/student/courses/:courseId/chat" element={<ProtectedRoute role="STUDENT"><StudentChatPage /></ProtectedRoute>} />
            <Route path="/student/seances" element={<ProtectedRoute role="STUDENT"><StudentSeancesPage /></ProtectedRoute>} />
            <Route path="/student/novaa"   element={<ProtectedRoute role="STUDENT"><NOVAAPage /></ProtectedRoute>} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  </React.StrictMode>
);
