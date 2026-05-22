import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import LoginPage             from "./pages/auth/LoginPage";
import LandingPage           from "./pages/LandingPage";

import AdminDashboard        from "./pages/admin/AdminDashboard";
import AdminProfilePage      from "./pages/admin/AdminProfilePage";
import UsersPage             from "./pages/admin/UsersPage";
import DepartmentsPage       from "./pages/admin/DepartmentsPage";
import FilieresPage          from "./pages/admin/FilieresPage";
import CoursesPage           from "./pages/admin/CoursesPage";

import TeacherDashboard      from "./pages/teacher/TeacherDashboard";
import TeacherProfilePage    from "./pages/teacher/TeacherProfilePage";
import ScanAttendance        from "./pages/teacher/ScanAttendance";
import DangerZonePage        from "./pages/teacher/DangerZonePage";
import TeacherMaterialsPage  from "./pages/teacher/TeacherMaterialsPage";
import ManualAttendancePage  from "./pages/teacher/ManualAttendancePage";

import StudentDashboard      from "./pages/student/StudentDashboard";
import StudentProfilePage    from "./pages/student/StudentProfilePage";
import StudentAttendancePage from "./pages/student/StudentAttendancePage";
import StudentChatPage       from "./pages/student/StudentChatPage";

import ProtectedRoute        from "./router/ProtectedRoute";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/login" element={<LoginPage />} />

        {/* ── Admin ─────────────────────────────────────────────────── */}
        <Route path="/admin" element={<ProtectedRoute role="ADMIN"><AdminDashboard /></ProtectedRoute>} />
        <Route path="/admin/profile" element={<ProtectedRoute role="ADMIN"><AdminProfilePage /></ProtectedRoute>} />
        <Route path="/admin/users" element={<ProtectedRoute role="ADMIN"><UsersPage /></ProtectedRoute>} />
        <Route path="/admin/departments" element={<ProtectedRoute role="ADMIN"><DepartmentsPage /></ProtectedRoute>} />
        <Route path="/admin/filieres" element={<ProtectedRoute role="ADMIN"><FilieresPage /></ProtectedRoute>} />
        <Route path="/admin/courses" element={<ProtectedRoute role="ADMIN"><CoursesPage /></ProtectedRoute>} />

        {/* ── Teacher ───────────────────────────────────────────────── */}
        <Route path="/teacher" element={<ProtectedRoute role="TEACHER"><TeacherDashboard /></ProtectedRoute>} />
        <Route path="/teacher/profile" element={<ProtectedRoute role="TEACHER"><TeacherProfilePage /></ProtectedRoute>} />
        <Route path="/teacher/scan" element={<ProtectedRoute role="TEACHER"><ScanAttendance /></ProtectedRoute>} />
        <Route path="/teacher/courses/:courseId/danger-zone" element={<ProtectedRoute role="TEACHER"><DangerZonePage /></ProtectedRoute>} />
        <Route path="/teacher/courses/:courseId/materials" element={<ProtectedRoute role="TEACHER"><TeacherMaterialsPage /></ProtectedRoute>} />
        <Route path="/teacher/courses/:courseId/attendance" element={<ProtectedRoute role="TEACHER"><ManualAttendancePage /></ProtectedRoute>} />

        {/* ── Student ───────────────────────────────────────────────── */}
        <Route path="/student" element={<ProtectedRoute role="STUDENT"><StudentDashboard /></ProtectedRoute>} />
        <Route path="/student/profile" element={<ProtectedRoute role="STUDENT"><StudentProfilePage /></ProtectedRoute>} />
        <Route path="/student/attendance" element={<ProtectedRoute role="STUDENT"><StudentAttendancePage /></ProtectedRoute>} />
        <Route path="/student/chat" element={<ProtectedRoute role="STUDENT"><StudentChatPage /></ProtectedRoute>} />

        {/* ── Fallback ──────────────────────────────────────────────── */}
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
