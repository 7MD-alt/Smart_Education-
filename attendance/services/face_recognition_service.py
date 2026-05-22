import json
from datetime import date

import numpy as np
import face_recognition

from attendance.models import StudentProfile, Course, AttendanceRecord, AttendanceStatus


MATCH_TOLERANCE = 0.5


def _normalize_encoding(raw_encoding):
    """
    Convert stored encoding to a numpy array of shape (128,).
    Supports:
    - Python list
    - JSON string
    - numpy-like list data
    """
    if raw_encoding is None:
        return None

    if isinstance(raw_encoding, str):
        try:
            raw_encoding = json.loads(raw_encoding)
        except Exception:
            return None

    if isinstance(raw_encoding, list):
        arr = np.array(raw_encoding, dtype=np.float64)
        if arr.shape == (128,):
            return arr

    return None


def recognize_and_mark_attendance(image_file, course_id):
    try:
        course = Course.objects.get(pk=course_id)
    except Course.DoesNotExist:
        return {
            "success": False,
            "error": f"Course with id={course_id} does not exist."
        }

    try:
        image = face_recognition.load_image_file(image_file)
    except Exception as e:
        return {
            "success": False,
            "error": f"Unable to read image: {str(e)}"
        }

    # Detect faces and generate encodings from uploaded image
    face_locations = face_recognition.face_locations(image)
    face_encodings = face_recognition.face_encodings(image, face_locations)

    if not face_encodings:
        return {
            "success": False,
            "recognized_students": [],
            "message": "No face detected in the image."
        }

    students = StudentProfile.objects.select_related("user").all()

    known_encodings = []
    known_students = []

    for student in students:
        enc = _normalize_encoding(student.face_encoding)
        if enc is not None:
            known_encodings.append(enc)
            known_students.append(student)

    if not known_encodings:
        return {
            "success": False,
            "recognized_students": [],
            "message": "No registered student face encodings found."
        }

    recognized_students = []
    already_marked_ids = set()

    for detected_encoding in face_encodings:
        face_distances = face_recognition.face_distance(known_encodings, detected_encoding)
        best_match_index = int(np.argmin(face_distances))
        best_distance = float(face_distances[best_match_index])

        if best_distance <= MATCH_TOLERANCE:
            matched_student = known_students[best_match_index]

            if matched_student.pk not in already_marked_ids:
                record, created = AttendanceRecord.objects.get_or_create(
                    course=course,
                    student=matched_student,
                    date=date.today(),
                    defaults={"status": AttendanceStatus.PRESENT},
                )

                if not created and record.status != AttendanceStatus.PRESENT:
                    record.status = AttendanceStatus.PRESENT
                    record.save()

                recognized_students.append({
                    "student_pk": matched_student.pk,
                    "student_id": matched_student.student_id,
                    "username": matched_student.user.username,
                    "full_name": f"{matched_student.user.first_name} {matched_student.user.last_name}".strip(),
                    "distance": round(best_distance, 4),
                    "status_marked": "PRESENT",
                })

                already_marked_ids.add(matched_student.pk)

    return {
        "success": True,
        "course_id": int(course_id),
        "faces_detected": len(face_encodings),
        "recognized_count": len(recognized_students),
        "recognized_students": recognized_students,
    }