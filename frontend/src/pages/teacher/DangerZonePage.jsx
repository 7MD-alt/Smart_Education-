import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axiosClient from "../../api/axiosClient";

const DangerZonePage = () => {
  const { courseId } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchDangerZone();
  }, [courseId]);

  const fetchDangerZone = async () => {
    try {
      const res = await axiosClient.get(`courses/${courseId}/danger-zone-students/`);
      setData(res.data);
    } catch (err) {
      console.error(err);
      setError("Impossible de charger les étudiants en danger.");
    }
  };

  return (
    <div style={{ padding: 40 }}>
      <h1>Danger Zone Students</h1>

      {error && <p style={{ color: "red" }}>{error}</p>}

      {data && (
        <>
          <h2>{data.course_title}</h2>

          {data.danger_students.length === 0 ? (
            <p>Aucun étudiant en danger.</p>
          ) : (
            data.danger_students.map((student) => (
              <div
                key={student.student_id}
                style={{
                  background: "#fff",
                  padding: 20,
                  borderRadius: 12,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                  marginBottom: 15,
                }}
              >
                <h3>{student.full_name}</h3>
                <p>Absences: {student.absences}</p>
                <p>Max absences: {student.max_absences}</p>
                <p>Status: {student.status}</p>
              </div>
            ))
          )}
        </>
      )}
    </div>
  );
};

export default DangerZonePage;