import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axiosClient from "../../api/axiosClient";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { BarChart3, BookOpen, Users, AlertTriangle } from "lucide-react";

const TeacherDashboard = () => {
  const [stats, setStats] = useState(null);
  const [courses, setCourses] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchStats();
    fetchCourses();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await axiosClient.get("teacher/stats/");
      setStats(res.data);
    } catch (err) {
      setError("Failed to load stats.");
    }
  };

  const fetchCourses = async () => {
    try {
      const res = await axiosClient.get("me/courses/");
      const data = Array.isArray(res.data)
        ? res.data
        : res.data.results || [];
      setCourses(data);
    } catch {
      setError("Failed to load courses.");
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-10">

        {/* HEADER */}
        <div>
          <h1 className="text-3xl font-semibold text-white">
            Teacher Dashboard
          </h1>
          <p className="mt-2 text-white/50">
            Manage your courses, students, and attendance.
          </p>
        </div>

        {/* STATS */}
        {stats && (
          <div className="grid gap-4 md:grid-cols-4">
            {[
              { label: "Courses", value: stats.courses, icon: BookOpen },
              { label: "Materials", value: stats.materials, icon: BarChart3 },
              { label: "Students", value: stats.students, icon: Users },
              {
                label: "Attendance",
                value: stats.attendance_records,
                icon: AlertTriangle,
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-5 backdrop-blur-xl">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-white/60">{item.label}</p>
                    <Icon className="h-5 w-5 text-white/40" />
                  </div>
                  <p className="mt-4 text-3xl font-semibold text-white">
                    {item.value}
                  </p>
                </div>
              );
            })}
          </div>
        )}

        {/* ACTION */}
        <Link to="/teacher/scan">
          <button className="rounded-xl bg-white px-5 py-3 text-black font-semibold hover:bg-white/90">
            Live Attendance Scan
          </button>
        </Link>

        {/* COURSES */}
        <div>
          <h2 className="text-xl font-semibold text-white">My Courses</h2>

          <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {courses.map((course) => (
              <div
                key={course.id}
                className="rounded-2xl border border-white/10 bg-white/[0.05] p-6 backdrop-blur-xl"
              >
                <h3 className="text-lg font-semibold text-white">
                  {course.title}
                </h3>

                <p className="mt-2 text-sm text-white/50">
                  Max absences: {course.max_absences}
                </p>

                <div className="mt-5 flex gap-3 flex-wrap">
                  <Link to={`/teacher/courses/${course.id}/danger-zone`}>
                    <button className="rounded-lg border border-white/10 px-4 py-2 text-sm text-white hover:bg-white/[0.08]">
                      Danger Zone
                    </button>
                  </Link>

                  <Link to={`/teacher/courses/${course.id}/materials`}>
                    <button className="rounded-lg border border-white/10 px-4 py-2 text-sm text-white hover:bg-white/[0.08]">
                      Materials
                    </button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        {error && <p className="text-red-400">{error}</p>}
      </div>
    </DashboardLayout>
  );
};

export default TeacherDashboard;