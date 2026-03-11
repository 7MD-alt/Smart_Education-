from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    # The Admin Control Panel
    path('admin/', admin.site.urls),
    
    # Routes all API requests to your attendance app
    path('', include('attendance.urls')), 
]