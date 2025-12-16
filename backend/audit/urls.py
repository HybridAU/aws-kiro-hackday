"""
URL configuration for audit app.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'logs', views.AuditLogViewSet, basename='audit-logs')
router.register(r'access-logs', views.DataAccessLogViewSet, basename='data-access-logs')
router.register(r'security-events', views.SecurityEventViewSet, basename='security-events')
router.register(r'health-logs', views.SystemHealthLogViewSet, basename='system-health-logs')

urlpatterns = [
    path('', include(router.urls)),
    path('search/', views.AuditSearchView.as_view(), name='audit-search'),
]