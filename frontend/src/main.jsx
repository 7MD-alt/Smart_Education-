import React, { lazy, Suspense } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./index.css";

import { AuthProvider } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";
import ProtectedRoute from "./router/ProtectedRoute";
import ErrorBoundary from "./components/ErrorBoundary";

// Lazy-load every page so each route is its own chunk. This keeps the initial
// bundle small (the heavy landing visual / three.js no longer loads up-front).
const LandingPage               = lazy(() => import("./pages/LandingPage"));
const LoginPage                 = lazy(() => import("./pages/auth/LoginPage"));

const AdminDashboard            = lazy(() => import("./pages/admin/AdminDashboard"));
const UsersPage                 = lazy(() => import("./pages/admin/UsersPage"));
const DepartmentsPage           = lazy(() => import("./pages/admin/DepartmentsPage"));
const FilieresPage              = lazy(() => import("./pages/admin/FilieresPage"));
const CoursesPage               = lazy(() => import("./pages/admin/CoursesPage"));
const AdminProfilePage          = lazy(() => import("./pages/admin/AdminProfilePage"));
const FaceRequestsPage          = lazy(() => import("./pages/admin/FaceRequestsPage"));

const TeacherDashboard          = lazy(() => import("./pages/teacher/TeacherDashboard"));
const TeacherCoursesPage        = lazy(() => import("./pages/teacher/TeacherCoursesPage"));
const TeacherMaterialsPage      = lazy(() => import("./pages/teacher/TeacherMaterialsPage"));
const DangerZonePage            = lazy(() => import("./pages/teacher/DangerZonePage"));
const TeacherProfilePage        = lazy(() => import("./pages/teacher/TeacherProfilePage"));
const ManualAttendancePage      = lazy(() => import("./pages/teacher/ManualAttendancePage"));
const SeancesPage               = lazy(() => import("./pages/teacher/SeancesPage"));
const SeanceRosterPage          = lazy(() => import("./pages/teacher/SeanceRosterPage"));

const StudentDashboard          = lazy(() => import("./pages/student/StudentDashboard"));
const StudentProfilePage        = lazy(() => import("./pages/student/StudentProfilePage"));
const StudentChatPage           = lazy(() => import("./pages/student/StudentChatPage"));
const StudentAttendancePage     = lazy(() => import("./pages/student/StudentAttendancePage"));
const StudentCourseMaterialsPage= lazy(() => import("./pages/student/StudentCourseMaterialsPage"));
const StudentSeancesPage        = lazy(() => import("./pages/student/StudentSeancesPage"));
const NOVAAPage                 = lazy(() => import("./pages/student/NOVAAPage"));

const PageFallback = () => (
  <div className="flex min-h-screen items-center justify-center bg-[#070b14]">
    <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-violet-400" />
  </div>
);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <ToastProvider>
          <BrowserRouter>
            <Suspense fallback={<PageFallback />}>
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
            </Suspense>
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
