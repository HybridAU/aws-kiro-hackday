"""
URL configuration for assessments app.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'assessments', views.AssessmentViewSet, basename='assessments')
router.register(r'templates', views.AssessmentTemplateViewSet, basename='assessment-templates')
router.register(r'reviews', views.AssessmentReviewViewSet, basename='assessment-reviews')

urlpatterns = [
    path('', include(router.urls)),
    path('applications/<uuid:application_id>/assessments/', 
         views.ApplicationAssessmentView.as_view(), 
         name='application-assessments'),
    path('stats/', views.AssessmentStatsView.as_view(), name='assessment-stats'),
]