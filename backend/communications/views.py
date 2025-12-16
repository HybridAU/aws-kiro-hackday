"""
Views for communication and notification management.
"""
from django.db.models import Q, Count
from django.core.mail import send_mail
from django.conf import settings
from rest_framework import generics, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet
from applications.models import GrantApplication
from .models import (
    Communication, 
    CommunicationThread, 
    ThreadMessage,
    NotificationPreference,
    PortalNotification,
    EmailTemplate
)
from .serializers import (
    CommunicationSerializer,
    CommunicationThreadSerializer,
    CommunicationThreadListSerializer,
    ThreadMessageSerializer,
    NotificationPreferenceSerializer,
    PortalNotificationSerializer,
    EmailTemplateSerializer,
    MessageComposeSerializer
)
from .services import NotificationService


class CommunicationViewSet(ModelViewSet):
    """
    ViewSet for communication management.
    """
    serializer_class = CommunicationSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        queryset = Communication.objects.select_related('sender', 'recipient', 'application')
        
        if user.is_organization:
            # Organizations see messages for their applications
            queryset = queryset.filter(
                Q(application__organization=user.organization) &
                Q(is_internal=False)  # Exclude internal admin messages
            )
        elif user.is_administrator:
            # Administrators see all messages
            pass
        else:
            return Communication.objects.none()
        
        # Filter by application if specified
        application_id = self.request.query_params.get('application')
        if application_id:
            queryset = queryset.filter(application_id=application_id)
        
        # Filter by read status
        is_read = self.request.query_params.get('is_read')
        if is_read is not None:
            if is_read.lower() == 'true':
                queryset = queryset.filter(read_at__isnull=False)
            else:
                queryset = queryset.filter(read_at__isnull=True)
        
        return queryset
    
    def perform_create(self, serializer):
        """Create communication and send notifications."""
        communication = serializer.save(sender=self.request.user)
        
        # Send email notification
        NotificationService.send_communication_notification(communication)
        
        # Create portal notification
        NotificationService.create_portal_notification(
            user=communication.recipient,
            title=f"New message: {communication.subject}",
            message=f"You have received a new message from {communication.sender.username}",
            notification_type='info',
            application=communication.application,
            communication=communication
        )
    
    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        """Mark a communication as read."""
        communication = self.get_object()
        
        # Only recipient can mark as read
        if communication.recipient != request.user:
            return Response(
                {'error': 'You can only mark your own messages as read'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        communication.mark_as_read()
        return Response({'message': 'Message marked as read'})
    
    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        """Get count of unread messages for current user."""
        count = self.get_queryset().filter(
            recipient=request.user,
            read_at__isnull=True
        ).count()
        return Response({'unread_count': count})
    
    @action(detail=False, methods=['post'])
    def compose(self, request):
        """Compose and send a new message."""
        application_id = request.data.get('application_id')
        
        try:
            application = GrantApplication.objects.get(id=application_id)
        except GrantApplication.DoesNotExist:
            return Response(
                {'error': 'Application not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        serializer = MessageComposeSerializer(
            data=request.data,
            context={'request': request, 'application': application}
        )
        serializer.is_valid(raise_exception=True)
        
        # Create the communication
        communication_data = {
            'application': application.id,
            'recipient': serializer.validated_data['recipient_id'].id,
            'subject': serializer.validated_data['subject'],
            'message': serializer.validated_data['message'],
            'message_type': serializer.validated_data['message_type'],
            'priority': serializer.validated_data['priority']
        }
        
        communication_serializer = CommunicationSerializer(
            data=communication_data,
            context={'request': request}
        )
        communication_serializer.is_valid(raise_exception=True)
        communication = communication_serializer.save()
        
        return Response(
            CommunicationSerializer(communication, context={'request': request}).data,
            status=status.HTTP_201_CREATED
        )


class CommunicationThreadViewSet(ModelViewSet):
    """
    ViewSet for communication thread management.
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action == 'list':
            return CommunicationThreadListSerializer
        return CommunicationThreadSerializer
    
    def get_queryset(self):
        user = self.request.user
        queryset = CommunicationThread.objects.prefetch_related('participants', 'messages')
        
        if user.is_organization:
            # Organizations see threads for their applications
            queryset = queryset.filter(
                application__organization=user.organization,
                participants=user
            )
        elif user.is_administrator:
            # Administrators see all threads they participate in
            queryset = queryset.filter(participants=user)
        else:
            return CommunicationThread.objects.none()
        
        return queryset.distinct()
    
    @action(detail=True, methods=['post'])
    def add_message(self, request, pk=None):
        """Add a message to the thread."""
        thread = self.get_object()
        
        # Check if user is a participant
        if not thread.participants.filter(id=request.user.id).exists():
            return Response(
                {'error': 'You are not a participant in this thread'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Check if thread is closed
        if thread.is_closed:
            return Response(
                {'error': 'Cannot add messages to a closed thread'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = ThreadMessageSerializer(
            data=request.data,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        message = serializer.save(thread=thread)
        
        # Update thread timestamp
        thread.save(update_fields=['updated_at'])
        
        # Send notifications to other participants
        for participant in thread.participants.exclude(id=request.user.id):
            NotificationService.create_portal_notification(
                user=participant,
                title=f"New message in thread: {thread.subject}",
                message=f"{request.user.username} added a message to the thread",
                notification_type='info',
                application=thread.application
            )
        
        return Response(
            ThreadMessageSerializer(message, context={'request': request}).data,
            status=status.HTTP_201_CREATED
        )
    
    @action(detail=True, methods=['post'])
    def close_thread(self, request, pk=None):
        """Close the communication thread."""
        thread = self.get_object()
        
        # Only administrators can close threads
        if not request.user.is_administrator:
            return Response(
                {'error': 'Only administrators can close threads'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        thread.close_thread(request.user)
        return Response({'message': 'Thread closed successfully'})
    
    @action(detail=True, methods=['post'])
    def reopen_thread(self, request, pk=None):
        """Reopen the communication thread."""
        thread = self.get_object()
        
        # Only administrators can reopen threads
        if not request.user.is_administrator:
            return Response(
                {'error': 'Only administrators can reopen threads'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        thread.reopen_thread()
        return Response({'message': 'Thread reopened successfully'})


class NotificationPreferenceViewSet(ModelViewSet):
    """
    ViewSet for notification preference management.
    """
    serializer_class = NotificationPreferenceSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return NotificationPreference.objects.filter(user=self.request.user)
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
    
    @action(detail=False, methods=['post'])
    def set_defaults(self, request):
        """Set default notification preferences for the user."""
        user = request.user
        
        # Default preferences
        defaults = [
            ('status_update', 'both'),
            ('new_message', 'both'),
            ('assessment_complete', 'email'),
            ('document_request', 'both'),
            ('deadline_reminder', 'email'),
        ]
        
        created_count = 0
        for event_type, method in defaults:
            preference, created = NotificationPreference.objects.get_or_create(
                user=user,
                event_type=event_type,
                defaults={
                    'notification_method': method,
                    'is_enabled': True
                }
            )
            if created:
                created_count += 1
        
        return Response({
            'message': f'Created {created_count} default notification preferences'
        })


class PortalNotificationViewSet(ModelViewSet):
    """
    ViewSet for portal notification management.
    """
    serializer_class = PortalNotificationSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        queryset = PortalNotification.objects.filter(user=self.request.user)
        
        # Filter by read status
        is_read = self.request.query_params.get('is_read')
        if is_read is not None:
            queryset = queryset.filter(is_read=is_read.lower() == 'true')
        
        return queryset
    
    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        """Mark a notification as read."""
        notification = self.get_object()
        notification.mark_as_read()
        return Response({'message': 'Notification marked as read'})
    
    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        """Mark all notifications as read for the current user."""
        count = PortalNotification.objects.filter(
            user=request.user,
            is_read=False
        ).update(is_read=True)
        
        return Response({'message': f'Marked {count} notifications as read'})
    
    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        """Get count of unread notifications."""
        count = PortalNotification.objects.filter(
            user=request.user,
            is_read=False
        ).count()
        return Response({'unread_count': count})


class EmailTemplateViewSet(ModelViewSet):
    """
    ViewSet for email template management (admin only).
    """
    serializer_class = EmailTemplateSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        # Only administrators can manage email templates
        if self.request.user.is_administrator:
            return EmailTemplate.objects.all()
        return EmailTemplate.objects.none()
    
    def perform_create(self, serializer):
        if not self.request.user.is_administrator:
            raise permissions.PermissionDenied("Only administrators can create email templates.")
        serializer.save(created_by=self.request.user)
    
    @action(detail=True, methods=['post'])
    def test_template(self, request, pk=None):
        """Test an email template with sample data."""
        template = self.get_object()
        
        # Sample context data
        context = {
            'user_name': 'John Doe',
            'organization_name': 'Sample Organization',
            'application_title': 'Sample Grant Application',
            'reference_number': 'GA-2024-ABC123',
            'status': 'Under Review'
        }
        
        try:
            rendered = template.render(context)
            return Response({
                'subject': rendered['subject'],
                'body': rendered['body']
            })
        except Exception as e:
            return Response(
                {'error': f'Template rendering failed: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )