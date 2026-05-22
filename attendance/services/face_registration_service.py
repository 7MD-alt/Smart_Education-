import face_recognition
from attendance.models import StudentProfile


def register_student_face(student_id, image_file):
    try:
        student = StudentProfile.objects.select_related("user").get(student_id=student_id)
    except StudentProfile.DoesNotExist:
        return {
            "success": False,
            "error": f"Student with student_id='{student_id}' does not exist."
        }

    try:
        image = face_recognition.load_image_file(image_file)
    except Exception as e:
        return {
            "success": False,
            "error": f"Unable to read image: {str(e)}"
        }

    face_locations = face_recognition.face_locations(image)

    if not face_locations:
        return {
            "success": False,
            "error": "No face detected in the image."
        }

    if len(face_locations) > 1:
        return {
            "success": False,
            "error": "Multiple faces detected. Please upload an image with exactly one face."
        }

    encodings = face_recognition.face_encodings(image, face_locations)

    if not encodings:
        return {
            "success": False,
            "error": "Face detected, but encoding could not be generated."
        }

    student.face_encoding = encodings[0].tolist()
    student.save()

    return {
        "success": True,
        "student_id": student.student_id,
        "username": student.user.username,
        "full_name": f"{student.user.first_name} {student.user.last_name}".strip(),
        "message": "Face encoding registered successfully."
    }