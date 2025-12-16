"""
URL configuration for applications app.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_nested import routers
from . import views

# Main router
router = DefaultRouter()
router.register(r'', views.GrantApplicationViewSet, basename='applications')

# Nested router for documents
applications_router = routers.NestedDefaultRouter(router, r'', lookup='application')
applications_router.register(r'documents', views.ApplicationDocumentViewSet, basename='application-documents')

urlpatterns = [
    path('', include(router.urls)),
    path('', include(applications_router.urls)),
]