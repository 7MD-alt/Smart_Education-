import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import LoginPage from "./pages/auth/LoginPage";
import AdminDashboard from "./pages/admin/AdminDashboard";
import TeacherDashboard from "./pages/teacher/TeacherDashboard";
import StudentDashboard from "./pages/student/StudentDashboard";
import DangerZonePage from "./pages/teacher/DangerZonePage";
import ScanAttendance from "./pages/teacher/ScanAttendance";
import TeacherMaterialsPage from "./pages/teacher/TeacherMaterialsPage";


import ProtectedRoute from "./router/ProtectedRoute";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" />} />
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
          path="/student"
          element={
            <ProtectedRoute role="STUDENT">
              <StudentDashboard />
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
  path="/teacher/courses/:courseId/danger-zone"
  element={
    <ProtectedRoute role="TEACHER">
      <DangerZonePage />
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

      </Routes>
    </BrowserRouter>
  );
}

export default App;
