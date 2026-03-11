from rest_framework import serializers
from .models import User, StudentProfile, Module, Session, AttendanceRecord

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'email', 'role']

class StudentProfileSerializer(serializers.ModelSerializer):
    # This nests the User info inside the Student profile so React gets the first/last name
    user = UserSerializer(read_only=True)
    
    class Meta:
        model = StudentProfile
        fields = ['id', 'user', 'student_id', 'filiere', 'qr_hash'] 
        # We intentionally leave out 'face_encoding' so we don't send massive arrays to React

class ModuleSerializer(serializers.ModelSerializer):
    professor_name = serializers.CharField(source='professor.last_name', read_only=True)
    
    class Meta:
        model = Module
        fields = '__all__'

class SessionSerializer(serializers.ModelSerializer):
    module_name = serializers.CharField(source='module.name', read_only=True)
    
    class Meta:
        model = Session
        fields = '__all__'

class AttendanceRecordSerializer(serializers.ModelSerializer):
    student_first_name = serializers.CharField(source='student.user.first_name', read_only=True)
    student_last_name = serializers.CharField(source='student.user.last_name', read_only=True)
    
    class Meta:
        model = AttendanceRecord
        fields = '__all__'
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        # Récupère le token standard
        data = super().validate(attrs)
        
        # Ajoute tes données personnalisées (le rôle !)
        data['role'] = self.user.role
        data['first_name'] = self.user.first_name
        data['last_name'] = self.user.last_name
        
        return data
