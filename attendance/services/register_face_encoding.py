import face_recognition

from attendance.models import StudentProfile


def register_student_face(student_profile_id, image_path):
    student = StudentProfile.objects.get(pk=student_profile_id)

    image = face_recognition.load_image_file(image_path)
    encodings = face_recognition.face_encodings(image)

    if not encodings:
        raise ValueError("No face found in the image.")

    student.face_encoding = encodings[0].tolist()
    student.save()

    return {
        "success": True,
        "student_id": student.student_id,
        "user": student.user.username,
    }