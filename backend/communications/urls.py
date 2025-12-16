"""
URL configuration for communications app.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'messages', views.CommunicationViewSet, basename='communications')
router.register(r'threads', views.CommunicationThreadViewSet, basename='communication-threads')
router.register(r'preferences', views.NotificationPreferenceViewSet, basename='notification-preferences')
router.register(r'notifications', views.PortalNotificationViewSet, basename='portal-notifications')
router.register(r'email-templates', views.EmailTemplateViewSet, basename='email-templates')

urlpatterns = [
    path('', include(router.urls)),
]