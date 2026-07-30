"""
URL configuration for school_portal project.
"""
from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse
from django.conf import settings
from django.conf.urls.static import static
from django.views.static import serve
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView
import re

def home(request):
    return JsonResponse({"status": "backend is running"})

from accounts.views.health import health_check_view

urlpatterns = [
    path('', home),
    path('admin/', admin.site.urls),
    path('api/health/', health_check_view),
    path('api/', include('accounts.urls')),
    path('api/', include('portal.urls')),
    # Manually serve media files in production for Render free tier
    path('media/<path:path>', serve, {'document_root': settings.MEDIA_ROOT}),
    # API Documentation
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
]