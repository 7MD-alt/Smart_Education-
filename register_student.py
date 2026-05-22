import os
import django
import cv2
import face_recognition

# 1. Connect this script to your Django project
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend_core.settings')
django.setup()

# Now we import your ACTUAL database tables
from attendance.models import User, StudentProfile

def register_new_student():
    print("--- EST Meknès Student Registration ---")
    
    # 2. Get student details from the terminal
    student_id = input("Enter Student ID (e.g., M12345): ")
    
    # Check if student already exists in the profile table
    if StudentProfile.objects.filter(student_id=student_id).exists():
        print(f"\nError: Student ID {student_id} is already registered!")
        return

    first_name = input("Enter First Name: ")
    last_name = input("Enter Last Name: ")
    email = input("Enter Email: ")
    filiere = input("Enter Filiere/Major (e.g., IA): ")

    # 3. Fire up the camera (CHANGED TO 1 TO BYPASS iVCam)
    print("\nStarting camera... Look at the lens and press 's' to capture.")
    video_capture = cv2.VideoCapture(0, cv2.CAP_DSHOW)
    
    if not video_capture.isOpened():
        print("Camera index 1 not found. Trying index 2...")
        video_capture = cv2.VideoCapture(2)

    while True:
        ret, frame = video_capture.read()
        if not ret:
            print("Failed to grab camera frame.")
            break
            
        cv2.imshow('Registration Camera (Press "s" to save, "q" to quit)', frame)

        key = cv2.waitKey(1)
        if key & 0xFF == ord('s'):
            print("\nProcessing face...")
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            face_locations = face_recognition.face_locations(rgb_frame)

            if not face_locations:
                print("❌ No face detected! Please try again.")
            elif len(face_locations) > 1:
                print("❌ Multiple faces detected! Make sure only YOU are in the frame.")
            else:
                # 4. Extract encoding and convert it to a standard Python list
                encodings = face_recognition.face_encodings(rgb_frame, face_locations)
                face_encoding_array = encodings[0].tolist() 

                # 5. Save everything to the database!
                try:
                    # First, create the Django Auth User
                    user = User.objects.create_user(
                        username=student_id.lower(),
                        email=email,
                        first_name=first_name,
                        last_name=last_name,
                        password='estm123', # Default password for new students
                        role='STUDENT'
                    )
                    
                    # Second, create the Student Profile with the AI data
                    student_profile = StudentProfile(
                        user=user,
                        student_id=student_id,
                        filiere=filiere,
                        face_encoding=face_encoding_array
                    )
                    student_profile.save()
                    
                    print(f"\n✅ SUCCESS! {first_name} {last_name} has been saved to the PostgreSQL database.")
                except Exception as e:
                    print(f"\n❌ Database Error: {e}")
                    
                break
                
        elif key & 0xFF == ord('q'):
            print("Registration cancelled.")
            break

    video_capture.release()
    cv2.destroyAllWindows()

if __name__ == '__main__':
    register_new_student()