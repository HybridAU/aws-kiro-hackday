"""
Views for grant application management.
"""
from django.utils import timezone
from django.core.mail import send_mail
from django.conf import settings
from rest_framework import generics, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet
from rest_framework.parsers import MultiPartParser, FormParser
from .models import GrantApplication, ApplicationDocument, ApplicationStatusHistory
from .serializers import (
    GrantApplicationSerializer,
    GrantApplicationListSerializer,
    ApplicationDocumentSerializer,
    ApplicationSubmissionSerializer,
    ApplicationStatusUpdateSerializer
)
from .permissions import IsOrganizationOwnerOrAdmin


class GrantApplicationViewSet(ModelViewSet):
    """
    ViewSet for grant application management.
    """
    permission_classes = [permissions.IsAuthenticated, IsOrganizationOwnerOrAdmin]
    
    def get_serializer_class(self):
        if self.action == 'list':
            return GrantApplicationListSerializer
        elif self.action == 'submit':
            return ApplicationSubmissionSerializer
        elif self.action == 'update_status':
            return ApplicationStatusUpdateSerializer
        return GrantApplicationSerializer
    
    def get_queryset(self):
        user = self.request.user
        if user.is_organization:
            # Organizations can only see their own applications
            return GrantApplication.objects.filter(organization=user.organization)
        elif user.is_administrator:
            # Administrators can see all applications
            return GrantApplication.objects.all()
        return GrantApplication.objects.none()
    
    def perform_create(self, serializer):
        """Create application for the current organization."""
        if not self.request.user.is_organization:
            raise permissions.PermissionDenied("Only organizations can create applications.")
        serializer.save(organization=self.request.user.organization)
    
    def perform_update(self, serializer):
        """Update application with validation."""
        application = self.get_object()
        if not application.can_be_edited():
            raise permissions.PermissionDenied("This application cannot be edited.")
        serializer.save()
    
    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        """Submit an application for review."""
        application = self.get_object()
        
        # Check permissions
        if not request.user.is_organization or application.organization != request.user.organization:
            raise permissions.PermissionDenied("You can only submit your own applications.")
        
        serializer = self.get_serializer(application, data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Update application status
        previous_status = application.status
        application.status = 'submitted'
        application.submitted_at = timezone.now()
        application.save()
        
        # Create status history record
        ApplicationStatusHistory.objects.create(
            application=application,
            previous_status=previous_status,
            new_status='submitted',
            changed_by=request.user,
            reason='Application submitted by organization'
        )
        
        # Send confirmation email
        self.send_submission_confirmation(application)
        
        return Response({
            'message': 'Application submitted successfully.',
            'reference_number': application.reference_number
        }, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def update_status(self, request, pk=None):
        """Update application status (admin only)."""
        if not request.user.is_administrator:
            raise permissions.PermissionDenied("Only administrators can update application status.")
        
        application = self.get_object()
        serializer = self.get_serializer(application, data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Update status
        previous_status = application.status
        new_status = serializer.validated_data['status']
        reason = serializer.validated_data.get('reason', '')
        
        application.status = new_status
        application.save()
        
        # Create status history record
        ApplicationStatusHistory.objects.create(
            application=application,
            previous_status=previous_status,
            new_status=new_status,
            changed_by=request.user,
            reason=reason
        )
        
        # Send notification email to organization
        self.send_status_update_notification(application, previous_status, new_status, reason)
        
        return Response({
            'message': f'Application status updated to {new_status}.',
            'status': new_status
        }, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['get'])
    def documents(self, request, pk=None):
        """Get documents for an application."""
        application = self.get_object()
        documents = application.documents.all()
        serializer = ApplicationDocumentSerializer(documents, many=True, context={'request': request})
        return Response(serializer.data)
    
    def send_submission_confirmation(self, application):
        """Send email confirmation for application submission."""
        send_mail(
            subject=f'Application Submitted - {application.reference_number}',
            message=f'''
            Dear {application.organization.contact_person},
            
            Your grant application "{application.title}" has been successfully submitted.
            
            Reference Number: {application.reference_number}
            Submitted Date: {application.submitted_at.strftime('%Y-%m-%d %H:%M')}
            
            You will receive updates as your application progresses through the review process.
            
            Best regards,
            Grants Management Team
            ''',
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[application.organization.user.email],
            fail_silently=False,
        )
    
    def send_status_update_notification(self, application, previous_status, new_status, reason):
        """Send email notification for status updates."""
        status_messages = {
            'under_review': 'Your application is now under review.',
            'approved': 'Congratulations! Your application has been approved.',
            'rejected': 'Unfortunately, your application has been rejected.',
        }
        
        message = f'''
        Dear {application.organization.contact_person},
        
        The status of your grant application "{application.title}" has been updated.
        
        Reference Number: {application.reference_number}
        Previous Status: {previous_status.replace('_', ' ').title()}
        New Status: {new_status.replace('_', ' ').title()}
        
        {status_messages.get(new_status, '')}
        
        {f"Reason: {reason}" if reason else ""}
        
        You can log into your account to view more details.
        
        Best regards,
        Grants Management Team
        '''
        
        send_mail(
            subject=f'Application Status Update - {application.reference_number}',
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[application.organization.user.email],
            fail_silently=False,
        )


class ApplicationDocumentViewSet(ModelViewSet):
    """
    ViewSet for application document management.
    """
    serializer_class = ApplicationDocumentSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    
    def get_queryset(self):
        application_id = self.kwargs.get('application_pk')
        if not application_id:
            return ApplicationDocument.objects.none()
        
        # Check if user has access to this application
        try:
            application = GrantApplication.objects.get(id=application_id)
            user = self.request.user
            
            if user.is_organization and application.organization == user.organization:
                return application.documents.all()
            elif user.is_administrator:
                return application.documents.all()
            else:
                return ApplicationDocument.objects.none()
        except GrantApplication.DoesNotExist:
            return ApplicationDocument.objects.none()
    
    def perform_create(self, serializer):
        """Create document for the specified application."""
        application_id = self.kwargs.get('application_pk')
        try:
            application = GrantApplication.objects.get(id=application_id)
            
            # Check permissions
            user = self.request.user
            if user.is_organization and application.organization != user.organization:
                raise permissions.PermissionDenied("You can only upload documents to your own applications.")
            
            # Check if application can be edited
            if not application.can_be_edited():
                raise permissions.PermissionDenied("Documents cannot be added to this application.")
            
            serializer.save(application=application)
        except GrantApplication.DoesNotExist:
            raise permissions.PermissionDenied("Application not found.")