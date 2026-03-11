import os
import django
import cv2
import face_recognition
import numpy as np
from datetime import time

# 1. Connect to Django Environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend_core.settings')
django.setup()

# Import the exact models from your models.py
from attendance.models import StudentProfile, Session, AttendanceRecord, Module, User
from django.utils import timezone

def get_or_create_todays_session():
    """Creates a dummy Session and Module so the script can log attendance."""
    # Create a dummy teacher if one doesn't exist
    admin, _ = User.objects.get_or_create(
        username='scanner_admin', 
        defaults={'role': 'TEACHER', 'first_name': 'AI', 'last_name': 'Scanner'}
    )

    # Create a dummy module
    module, _ = Module.objects.get_or_create(
        code="TEST-01",
        defaults={'name': "Live Scanner Testing", 'professor': admin}
    )

    # Create the session for today
    session, created = Session.objects.get_or_create(
        module=module,
        date=timezone.now().date(),
        defaults={
            'start_time': time(8, 0),
            'end_time': time(10, 0),
            'status': 'LIVE'
        }
    )
    return session

def run_scanner():
    print("--- EST Meknès Live Attendance Scanner ---")
    print("Loading student data from PostgreSQL...")

    # 2. Fetch StudentProfiles instead of Student
    students = StudentProfile.objects.exclude(face_encoding__isnull=True)
    
    known_face_encodings = []
    known_face_names = []
    known_students = []

    for student in students:
        known_face_encodings.append(np.array(student.face_encoding))
        # Fetch the name through the linked User model
        known_face_names.append(f"{student.user.first_name} {student.user.last_name}")
        known_students.append(student)

    if not known_face_encodings:
        print("No registered students found! Register faces in the dashboard first.")
        return

    print(f"Loaded {len(known_face_names)} students. Starting camera...")
    session = get_or_create_todays_session()
    
    # 3. Initialize Webcam (Smart Auto-Detect)
    print("Searching for available camera...")
    
    video_capture = None
    # We will try indices 0, 1, and 2 just to be safe
    for camera_index in [0, 1, 2]:
        # cv2.CAP_DSHOW forces Windows to load the camera instantly
        cap = cv2.VideoCapture(camera_index, cv2.CAP_DSHOW)
        if cap.isOpened():
            ret, _ = cap.read()
            if ret:
                print(f"✅ Successfully connected to Camera Index {camera_index}!")
                video_capture = cap
                break
        cap.release()

    # Fallback if CAP_DSHOW fails
    if video_capture is None:
        print("DirectShow backend failed. Trying standard backend...")
        for camera_index in [0, 1, 2]:
            cap = cv2.VideoCapture(camera_index)
            if cap.isOpened():
                ret, _ = cap.read()
                if ret:
                    print(f"✅ Successfully connected to Camera Index {camera_index}!")
                    video_capture = cap
                    break
            cap.release()

    if video_capture is None:
        print("❌ CRITICAL ERROR: Could not find any working webcam.")
        return

    while True:
        ret, frame = video_capture.read()
        if not ret:
            print("Failed to grab frame. Check your webcam connection.")
            break
            
        # ... (The rest of your face_recognition code stays exactly the same from here)
        
        small_frame = cv2.resize(frame, (0, 0), fx=0.25, fy=0.25)
        rgb_small_frame = cv2.cvtColor(small_frame, cv2.COLOR_BGR2RGB)

        face_locations = face_recognition.face_locations(rgb_small_frame)
        face_encodings = face_recognition.face_encodings(rgb_small_frame, face_locations)

        face_names = []

        for face_encoding in face_encodings:
            matches = face_recognition.compare_faces(known_face_encodings, face_encoding, tolerance=0.5)
            name = "Unknown"

            if True in matches:
                face_distances = face_recognition.face_distance(known_face_encodings, face_encoding)
                best_match_index = np.argmin(face_distances)

                if matches[best_match_index]:
                    name = known_face_names[best_match_index]
                    matched_student = known_students[best_match_index]
                    
                    # Calculate accuracy for the new confidence_score field
                    confidence = round(1 - face_distances[best_match_index], 2)

                    # 6. Log to PostgreSQL
                    record, created = AttendanceRecord.objects.get_or_create(
                        student=matched_student,
                        session=session,
                        defaults={
                            'is_present': True,
                            'confidence_score': confidence
                        }
                    )
                    
                    if created:
                        print(f"✅ SUCCESS: Marked {name} as Present. (Confidence: {confidence})")

            face_names.append(name)

        for (top, right, bottom, left), name in zip(face_locations, face_names):
            top *= 4
            right *= 4
            bottom *= 4
            left *= 4

            color = (0, 255, 0) if name != "Unknown" else (0, 0, 255)
            
            cv2.rectangle(frame, (left, top), (right, bottom), color, 2)
            cv2.rectangle(frame, (left, bottom - 35), (right, bottom), color, cv2.FILLED)
            cv2.putText(frame, name, (left + 6, bottom - 6), cv2.FONT_HERSHEY_DUPLEX, 0.8, (255, 255, 255), 1)

        cv2.imshow('SmartAttend Live Scanner', frame)

        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    video_capture.release()
    cv2.destroyAllWindows()

if __name__ == '__main__':
    run_scanner()