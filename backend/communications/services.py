"""
Services for communication and notification management.
"""
from django.core.mail import send_mail
from django.conf import settings
from django.template import Template, Context
from .models import (
    Communication, 
    NotificationPreference, 
    PortalNotification, 
    EmailTemplate
)


class NotificationService:
    """
    Service class for handling notifications.
    """
    
    @staticmethod
    def send_communication_notification(communication):
        """Send email notification for a new communication."""
        recipient = communication.recipient
        
        # Check user's notification preferences
        try:
            preference = NotificationPreference.objects.get(
                user=recipient,
                event_type='new_message'
            )
            if not preference.is_enabled or preference.notification_method == 'portal':
                return
        except NotificationPreference.DoesNotExist:
            # Default to sending email if no preference set
            pass
        
        # Get email template or use default
        try:
            template = EmailTemplate.objects.get(
                template_type='new_message',
                is_active=True
            )
            context = {
                'recipient_name': recipient.username,
                'sender_name': communication.sender.username,
                'subject': communication.subject,
                'message': communication.message,
                'application_reference': communication.application.reference_number,
                'application_title': communication.application.title
            }
            rendered = template.render(context)
            subject = rendered['subject']
            message = rendered['body']
        except EmailTemplate.DoesNotExist:
            # Default email content
            subject = f'New Message: {communication.subject}'
            message = f'''
            Dear {recipient.username},
            
            You have received a new message from {communication.sender.username}.
            
            Subject: {communication.subject}
            Application: {communication.application.reference_number} - {communication.application.title}
            
            Message:
            {communication.message}
            
            Please log into your account to view and respond to this message.
            
            Best regards,
            Grants Management Team
            '''
        
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[recipient.email],
            fail_silently=False,
        )
    
    @staticmethod
    def send_status_update_notification(application, previous_status, new_status, reason=''):
        """Send notification for application status updates."""
        user = application.organization.user
        
        # Check user's notification preferences
        try:
            preference = NotificationPreference.objects.get(
                user=user,
                event_type='status_update'
            )
            if not preference.is_enabled:
                return
            
            send_email = preference.notification_method in ['email', 'both']
            send_portal = preference.notification_method in ['portal', 'both']
        except NotificationPreference.DoesNotExist:
            # Default to both email and portal
            send_email = True
            send_portal = True
        
        # Send email notification
        if send_email:
            NotificationService._send_status_update_email(
                application, user, previous_status, new_status, reason
            )
        
        # Create portal notification
        if send_portal:
            NotificationService.create_portal_notification(
                user=user,
                title=f'Status Update: {application.reference_number}',
                message=f'Your application status has been updated to {new_status.replace("_", " ").title()}',
                notification_type='info',
                application=application
            )
    
    @staticmethod
    def _send_status_update_email(application, user, previous_status, new_status, reason):
        """Send email for status update."""
        try:
            template = EmailTemplate.objects.get(
                template_type='status_update',
                is_active=True
            )
            context = {
                'user_name': user.username,
                'organization_name': application.organization.name,
                'application_title': application.title,
                'reference_number': application.reference_number,
                'previous_status': previous_status.replace('_', ' ').title(),
                'new_status': new_status.replace('_', ' ').title(),
                'reason': reason
            }
            rendered = template.render(context)
            subject = rendered['subject']
            message = rendered['body']
        except EmailTemplate.DoesNotExist:
            # Default email content
            subject = f'Application Status Update - {application.reference_number}'
            
            status_messages = {
                'under_review': 'Your application is now under review.',
                'approved': 'Congratulations! Your application has been approved.',
                'rejected': 'Unfortunately, your application has been rejected.',
            }
            
            message = f'''
            Dear {user.username},
            
            The status of your grant application has been updated.
            
            Application: {application.reference_number} - {application.title}
            Previous Status: {previous_status.replace('_', ' ').title()}
            New Status: {new_status.replace('_', ' ').title()}
            
            {status_messages.get(new_status, '')}
            
            {f"Reason: {reason}" if reason else ""}
            
            Please log into your account to view more details.
            
            Best regards,
            Grants Management Team
            '''
        
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=False,
        )
    
    @staticmethod
    def send_assessment_notification(assessment):
        """Send notification when an assessment is completed."""
        application = assessment.application
        user = application.organization.user
        
        # Check user's notification preferences
        try:
            preference = NotificationPreference.objects.get(
                user=user,
                event_type='assessment_complete'
            )
            if not preference.is_enabled:
                return
            
            send_email = preference.notification_method in ['email', 'both']
            send_portal = preference.notification_method in ['portal', 'both']
        except NotificationPreference.DoesNotExist:
            # Default to email only
            send_email = True
            send_portal = False
        
        # Send email notification
        if send_email:
            subject = f'Assessment Completed - {application.reference_number}'
            message = f'''
            Dear {user.username},
            
            An assessment has been completed for your grant application.
            
            Application: {application.reference_number} - {application.title}
            Assessor: {assessment.administrator.username}
            Score: {assessment.score}/10
            Recommendation: {assessment.get_recommendation_display()}
            
            Please log into your account to view the full assessment details.
            
            Best regards,
            Grants Management Team
            '''
            
            send_mail(
                subject=subject,
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                fail_silently=False,
            )
        
        # Create portal notification
        if send_portal:
            NotificationService.create_portal_notification(
                user=user,
                title=f'Assessment Completed: {application.reference_number}',
                message=f'Your application has been assessed with a score of {assessment.score}/10',
                notification_type='info',
                application=application
            )
    
    @staticmethod
    def create_portal_notification(user, title, message, notification_type='info', 
                                 application=None, communication=None):
        """Create a portal notification."""
        return PortalNotification.objects.create(
            user=user,
            title=title,
            message=message,
            notification_type=notification_type,
            application=application,
            communication=communication
        )
    
    @staticmethod
    def send_document_request_notification(application, requested_documents, message=''):
        """Send notification for document requests."""
        user = application.organization.user
        
        # Check user's notification preferences
        try:
            preference = NotificationPreference.objects.get(
                user=user,
                event_type='document_request'
            )
            if not preference.is_enabled:
                return
            
            send_email = preference.notification_method in ['email', 'both']
            send_portal = preference.notification_method in ['portal', 'both']
        except NotificationPreference.DoesNotExist:
            # Default to both
            send_email = True
            send_portal = True
        
        # Send email notification
        if send_email:
            subject = f'Document Request - {application.reference_number}'
            email_message = f'''
            Dear {user.username},
            
            Additional documents have been requested for your grant application.
            
            Application: {application.reference_number} - {application.title}
            
            Requested Documents:
            {chr(10).join(f"- {doc}" for doc in requested_documents)}
            
            {f"Additional Information: {message}" if message else ""}
            
            Please log into your account to upload the requested documents.
            
            Best regards,
            Grants Management Team
            '''
            
            send_mail(
                subject=subject,
                message=email_message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                fail_silently=False,
            )
        
        # Create portal notification
        if send_portal:
            NotificationService.create_portal_notification(
                user=user,
                title=f'Document Request: {application.reference_number}',
                message=f'Additional documents have been requested for your application',
                notification_type='warning',
                application=application
            )