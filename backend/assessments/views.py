"""
Views for assessment and review management.
"""
from django.db.models import Avg, Count, Q
from django.core.mail import send_mail
from django.conf import settings
from rest_framework import generics, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet
from applications.models import GrantApplication
from applications.permissions import IsAdministrator
from .models import (
    Assessment, 
    AssessmentTemplate, 
    AssessmentReview
)
from .serializers import (
    AssessmentSerializer,
    AssessmentListSerializer,
    AssessmentTemplateSerializer,
    AssessmentReviewSerializer,
    ApplicationAssessmentSummarySerializer
)


class AssessmentViewSet(ModelViewSet):
    """
    ViewSet for assessment management.
    """
    permission_classes = [permissions.IsAuthenticated, IsAdministrator]
    
    def get_serializer_class(self):
        if self.action == 'list':
            return AssessmentListSerializer
        return AssessmentSerializer
    
    def get_queryset(self):
        queryset = Assessment.objects.select_related('application', 'administrator')
        
        # Filter by application if specified
        application_id = self.request.query_params.get('application')
        if application_id:
            queryset = queryset.filter(application_id=application_id)
        
        # Filter by administrator if specified
        administrator_id = self.request.query_params.get('administrator')
        if administrator_id:
            queryset = queryset.filter(administrator_id=administrator_id)
        
        return queryset
    
    def perform_create(self, serializer):
        """Create assessment and update application status."""
        assessment = serializer.save(administrator=self.request.user)
        
        # Update application status to under_review if it's still submitted
        application = assessment.application
        if application.status == 'submitted':
            application.status = 'under_review'
            application.save()
            
            # Create status history
            from applications.models import ApplicationStatusHistory
            ApplicationStatusHistory.objects.create(
                application=application,
                previous_status='submitted',
                new_status='under_review',
                changed_by=self.request.user,
                reason='Assessment created - application under review'
            )
    
    @action(detail=False, methods=['get'])
    def my_assessments(self, request):
        """Get assessments created by the current administrator."""
        assessments = Assessment.objects.filter(administrator=request.user)
        serializer = self.get_serializer(assessments, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Get assessment summary for all applications."""
        # Get applications with their assessment data
        applications = GrantApplication.objects.filter(
            status__in=['submitted', 'under_review', 'approved', 'rejected']
        ).annotate(
            assessment_count=Count('assessments'),
            average_score=Avg('assessments__score')
        ).prefetch_related('assessments')
        
        summary_data = []
        for app in applications:
            # Get recommendation counts
            recommendations = {}
            for assessment in app.assessments.all():
                rec = assessment.recommendation
                recommendations[rec] = recommendations.get(rec, 0) + 1
            
            # Get latest assessment
            latest_assessment = app.assessments.first()
            
            summary_data.append({
                'application': app,
                'assessment_count': app.assessment_count,
                'average_score': app.average_score,
                'recommendations': recommendations,
                'latest_assessment': latest_assessment
            })
        
        serializer = ApplicationAssessmentSummarySerializer(summary_data, many=True)
        return Response(serializer.data)


class AssessmentTemplateViewSet(ModelViewSet):
    """
    ViewSet for assessment template management.
    """
    serializer_class = AssessmentTemplateSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdministrator]
    
    def get_queryset(self):
        queryset = AssessmentTemplate.objects.all()
        
        # Filter by active status
        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')
        
        return queryset
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
    
    @action(detail=True, methods=['post'])
    def apply_to_assessment(self, request, pk=None):
        """Apply template criteria to a new assessment."""
        template = self.get_object()
        application_id = request.data.get('application_id')
        
        if not application_id:
            return Response(
                {'error': 'application_id is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            application = GrantApplication.objects.get(id=application_id)
        except GrantApplication.DoesNotExist:
            return Response(
                {'error': 'Application not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check if user already has an assessment for this application
        existing_assessment = Assessment.objects.filter(
            application=application,
            administrator=request.user
        ).first()
        
        if existing_assessment:
            return Response(
                {'error': 'You already have an assessment for this application'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create assessment with template criteria
        assessment_data = {
            'application': application.id,
            'score': 5,  # Default score
            'comments': f'Assessment created using template: {template.name}',
            'recommendation': 'request_info',  # Default recommendation
            'criteria': []
        }
        
        # Add criteria from template
        for template_criteria in template.criteria.all():
            assessment_data['criteria'].append({
                'criteria_type': template_criteria.criteria_type,
                'score': 5,  # Default score
                'weight': template_criteria.weight,
                'comments': template_criteria.description
            })
        
        serializer = AssessmentSerializer(data=assessment_data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        assessment = serializer.save()
        
        return Response(
            AssessmentSerializer(assessment, context={'request': request}).data,
            status=status.HTTP_201_CREATED
        )


class AssessmentReviewViewSet(ModelViewSet):
    """
    ViewSet for assessment review management.
    """
    serializer_class = AssessmentReviewSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdministrator]
    
    def get_queryset(self):
        queryset = AssessmentReview.objects.select_related('assessment', 'reviewer')
        
        # Filter by assessment if specified
        assessment_id = self.request.query_params.get('assessment')
        if assessment_id:
            queryset = queryset.filter(assessment_id=assessment_id)
        
        # Filter by reviewer if specified
        reviewer_id = self.request.query_params.get('reviewer')
        if reviewer_id:
            queryset = queryset.filter(reviewer_id=reviewer_id)
        
        # Filter by status if specified
        review_status = self.request.query_params.get('status')
        if review_status:
            queryset = queryset.filter(status=review_status)
        
        return queryset
    
    def perform_create(self, serializer):
        """Create review and send notification."""
        review = serializer.save(reviewer=self.request.user)
        
        # Send notification to original assessor
        self.send_review_notification(review)
    
    @action(detail=False, methods=['get'])
    def pending_reviews(self, request):
        """Get pending reviews for the current administrator."""
        # Get assessments that need review (excluding own assessments)
        assessments_needing_review = Assessment.objects.exclude(
            administrator=request.user
        ).exclude(
            reviews__reviewer=request.user
        ).filter(
            application__status='under_review'
        )
        
        serializer = AssessmentListSerializer(assessments_needing_review, many=True)
        return Response(serializer.data)
    
    def send_review_notification(self, review):
        """Send email notification about assessment review."""
        assessment = review.assessment
        
        send_mail(
            subject=f'Assessment Review - {assessment.application.reference_number}',
            message=f'''
            Dear {assessment.administrator.username},
            
            Your assessment for application "{assessment.application.title}" has been reviewed.
            
            Application Reference: {assessment.application.reference_number}
            Review Status: {review.get_status_display()}
            Reviewer: {review.reviewer.username}
            
            Comments: {review.comments}
            
            Please log into the admin portal to view the full review.
            
            Best regards,
            Grants Management Team
            ''',
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[assessment.administrator.email],
            fail_silently=False,
        )


class ApplicationAssessmentView(generics.ListAPIView):
    """
    View to get all assessments for a specific application.
    """
    serializer_class = AssessmentListSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdministrator]
    
    def get_queryset(self):
        application_id = self.kwargs.get('application_id')
        return Assessment.objects.filter(application_id=application_id)


class AssessmentStatsView(generics.GenericAPIView):
    """
    View to get assessment statistics.
    """
    permission_classes = [permissions.IsAuthenticated, IsAdministrator]
    
    def get(self, request):
        stats = {
            'total_assessments': Assessment.objects.count(),
            'assessments_by_recommendation': {},
            'average_score': Assessment.objects.aggregate(avg_score=Avg('score'))['avg_score'],
            'assessments_by_administrator': {},
            'pending_reviews': AssessmentReview.objects.filter(status='pending').count(),
        }
        
        # Assessments by recommendation
        for choice in Assessment.RECOMMENDATION_CHOICES:
            count = Assessment.objects.filter(recommendation=choice[0]).count()
            stats['assessments_by_recommendation'][choice[1]] = count
        
        # Assessments by administrator
        admin_stats = Assessment.objects.values(
            'administrator__username'
        ).annotate(
            count=Count('id'),
            avg_score=Avg('score')
        )
        
        for admin_stat in admin_stats:
            username = admin_stat['administrator__username']
            stats['assessments_by_administrator'][username] = {
                'count': admin_stat['count'],
                'average_score': admin_stat['avg_score']
            }
        
        return Response(stats)