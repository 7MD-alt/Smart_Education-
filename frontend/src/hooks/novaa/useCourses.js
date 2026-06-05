import { useState, useEffect } from "react";
import axiosClient from "../../api/axiosClient";

/**
 * Loads the authenticated student's enrolled courses and manages the
 * currently selected course for RAG context.
 *
 * @param {string|null} initialCourseId  - courseId from URL params (optional)
 */
export function useCourses(initialCourseId = null) {
  const [courses,        setCourses]        = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(initialCourseId ?? null);

  useEffect(() => {
    const load = async () => {
      try {
        const res  = await axiosClient.get("me/courses/");
        const list = Array.isArray(res.data) ? res.data : res.data.results ?? [];
        setCourses(list);

        // NOTE: we intentionally do NOT auto-select a course. NOVAA starts in
        // general mode; the student opts into a course as RAG context only when
        // they pick one (or arrive via a course-specific URL). This prevents
        // answers from being silently scoped to one course by default.
      } catch (err) {
        console.error("[useCourses]", err);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** The full course object matching selectedCourse, or undefined */
  const activeCourse = courses.find(c => String(c.id) === String(selectedCourse));

  return { courses, selectedCourse, setSelectedCourse, activeCourse };
}
