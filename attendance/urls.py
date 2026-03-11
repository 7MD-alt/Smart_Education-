from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    UserViewSet, StudentProfileViewSet, ModuleViewSet, 
    SessionViewSet, AttendanceRecordViewSet, CustomTokenObtainPairView,
    recognize_frame  # <-- Added the AI endpoint here
)

router = DefaultRouter()
router.register(r'users', UserViewSet)
router.register(r'students', StudentProfileViewSet)
router.register(r'modules', ModuleViewSet)
router.register(r'sessions', SessionViewSet)
router.register(r'attendance', AttendanceRecordViewSet)

urlpatterns = [
    # 1. THIS MUST BE FIRST: The Login API
    path('api/login/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    
    # 2. The AI Web Scanner Endpoint
    path('api/recognize_frame/', recognize_frame, name='recognize_frame'),
    
    # 3. THIS GOES LAST: The rest of the database APIs
    path('api/', include(router.urls)),
]