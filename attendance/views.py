import base64
import numpy as np
import cv2
import face_recognition
from rest_framework import viewsets
from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.utils import timezone
from datetime import time
from rest_framework_simplejwt.views import TokenObtainPairView

# 1. Import the CORRECT database models
from .models import User, StudentProfile, Module, Session, AttendanceRecord

# 2. Import your serializers (assuming standard naming based on your models)
from .serializers import (
    UserSerializer, StudentProfileSerializer, ModuleSerializer, 
    SessionSerializer, AttendanceRecordSerializer
)

# ==========================================
# STANDARD API ENDPOINTS (For React Dashboard)
# ==========================================

class CustomTokenObtainPairView(TokenObtainPairView):
    # Your custom login view
    pass

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer

class StudentProfileViewSet(viewsets.ModelViewSet):
    queryset = StudentProfile.objects.all()
    serializer_class = StudentProfileSerializer

class ModuleViewSet(viewsets.ModelViewSet):
    queryset = Module.objects.all()
    serializer_class = ModuleSerializer

class SessionViewSet(viewsets.ModelViewSet):
    queryset = Session.objects.all()
    serializer_class = SessionSerializer

class AttendanceRecordViewSet(viewsets.ModelViewSet):
    # Order by newest first so the live feed updates instantly
    queryset = AttendanceRecord.objects.all().order_by('-timestamp')
    serializer_class = AttendanceRecordSerializer


# ==========================================
# AI SCANNER ENDPOINT (For React Web Camera)
# ==========================================

@api_view(['POST'])
def recognize_frame(request):
    image_data = request.data.get('image')
    if not image_data:
        return Response({"error": "No image provided"}, status=400)

    # Decode image from React
    format, imgstr = image_data.split(';base64,') 
    img_bytes = base64.b64decode(imgstr)
    nparr = np.frombuffer(img_bytes, np.uint8)
    frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

    face_locations = face_recognition.face_locations(rgb_frame)
    face_encodings = face_recognition.face_encodings(rgb_frame, face_locations)

    # Use StudentProfile instead of Student
    students = StudentProfile.objects.exclude(face_encoding__isnull=True)
    known_encodings = [np.array(s.face_encoding) for s in students]
    known_students = list(students)

    detected_names = []
    
    # Create dummy session targets so the web scanner has somewhere to log
    admin, _ = User.objects.get_or_create(username='web_admin', defaults={'role': 'TEACHER', 'first_name': 'Web', 'last_name': 'Admin'})
    module, _ = Module.objects.get_or_create(code="WEB-01", defaults={'name': "Web Scanner Module", 'professor': admin})
    session, _ = Session.objects.get_or_create(
        module=module, 
        date=timezone.now().date(),
        defaults={'start_time': time(8, 0), 'end_time': time(10, 0), 'status': 'LIVE'}
    )

    for face_encoding in face_encodings:
        if not known_encodings:
            break
            
        matches = face_recognition.compare_faces(known_encodings, face_encoding, tolerance=0.55)
        if True in matches:
            face_distances = face_recognition.face_distance(known_encodings, face_encoding)
            best_match_index = np.argmin(face_distances)
            
            if matches[best_match_index]:
                student = known_students[best_match_index]
                # Notice how it uses student.user.first_name to navigate the database relationships
                detected_names.append(f"{student.user.first_name} {student.user.last_name}")
                
                confidence = round(1 - face_distances[best_match_index], 2)
                
                # Log to PostgreSQL
                AttendanceRecord.objects.get_or_create(
                    student=student,
                    session=session,
                    defaults={
                        'is_present': True,
                        'confidence_score': confidence
                    }
                )

    return Response({"detected": detected_names}, status=200)
from .serializers import CustomTokenObtainPairSerializer

class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer