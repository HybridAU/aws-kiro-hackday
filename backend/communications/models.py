"""
Communication models for messaging between users.
"""
import uuid
from django.db import models
from django.utils import timezone
from accounts.models import User
from applications.models import GrantApplication


class Communication(models.Model):
    """
    Model for messages exchanged between administrators and organizations.
    """
    MESSAGE_TYPES = [
        ('message', 'General Message'),
        ('request_info', 'Information Request'),
        ('status_update', 'Status Update'),
        ('system', 'System Notification'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    application = models.ForeignKey(GrantApplication, on_delete=models.CASCADE, related_name='communications')
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_messages')
    recipient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='received_messages')
    
    # Message details
    message_type = models.CharField(max_length=20, choices=MESSAGE_TYPES, default='message')
    subject = models.CharField(max_length=255)
    message = models.TextField()
    
    # Timestamps
    sent_at = models.DateTimeField(auto_now_add=True)
    read_at = models.DateTimeField(null=True, blank=True)
    
    # Metadata
    is_internal = models.BooleanField(default=False, help_text="Internal admin notes not visible to organizations")
    priority = models.CharField(
        max_length=10,
        choices=[('low', 'Low'), ('normal', 'Normal'), ('high', 'High')],
        default='normal'
    )
    
    class Meta:
        db_table = 'communications'
        ordering = ['-sent_at']
        
    def __str__(self):
        return f"{self.sender.username} → {self.recipient.username}: {self.subject}"
    
    def mark_as_read(self):
        """Mark the message as read."""
        if not self.read_at:
            self.read_at = timezone.now()
            self.save(update_fields=['read_at'])
    
    @property
    def is_read(self):
        """Check if the message has been read."""
        return self.read_at is not None
    
    def save(self, *args, **kwargs):
        # Validate sender and recipient roles
        if self.sender.is_organization and self.recipient.is_organization:
            raise ValueError("Organizations cannot send messages directly to other organizations.")
        
        # Set internal flag for admin-to-admin messages
        if self.sender.is_administrator and self.recipient.is_administrator:
            self.is_internal = True
        
        super().save(*args, **kwargs)


class CommunicationThread(models.Model):
    """
    Model to group related communications into threads.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    application = models.ForeignKey(GrantApplication, on_delete=models.CASCADE, related_name='communication_threads')
    subject = models.CharField(max_length=255)
    participants = models.ManyToManyField(User, related_name='communication_threads')
    
    # Thread metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_closed = models.BooleanField(default=False)
    closed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='closed_threads')
    closed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'communication_threads'
        ordering = ['-updated_at']
        
    def __str__(self):
        return f"Thread: {self.subject} ({self.application.reference_number})"
    
    def close_thread(self, user):
        """Close the communication thread."""
        self.is_closed = True
        self.closed_by = user
        self.closed_at = timezone.now()
        self.save(update_fields=['is_closed', 'closed_by', 'closed_at'])
    
    def reopen_thread(self):
        """Reopen the communication thread."""
        self.is_closed = False
        self.closed_by = None
        self.closed_at = None
        self.save(update_fields=['is_closed', 'closed_by', 'closed_at'])
    
    def get_latest_message(self):
        """Get the latest message in this thread."""
        return self.messages.first()
    
    def get_unread_count_for_user(self, user):
        """Get count of unread messages for a specific user."""
        return self.messages.filter(recipient=user, read_at__isnull=True).count()


class ThreadMessage(models.Model):
    """
    Model for messages within a communication thread.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    thread = models.ForeignKey(CommunicationThread, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name='thread_messages')
    message = models.TextField()
    
    # Timestamps
    sent_at = models.DateTimeField(auto_now_add=True)
    
    # Message metadata
    is_internal = models.BooleanField(default=False)
    
    class Meta:
        db_table = 'thread_messages'
        ordering = ['-sent_at']
        
    def __str__(self):
        return f"{self.sender.username} in {self.thread.subject}: {self.message[:50]}..."


class NotificationPreference(models.Model):
    """
    Model for user notification preferences.
    """
    NOTIFICATION_TYPES = [
        ('email', 'Email'),
        ('portal', 'Portal Notification'),
        ('both', 'Both Email and Portal'),
        ('none', 'No Notifications'),
    ]
    
    EVENT_TYPES = [
        ('status_update', 'Application Status Updates'),
        ('new_message', 'New Messages'),
        ('assessment_complete', 'Assessment Completed'),
        ('document_request', 'Document Requests'),
        ('deadline_reminder', 'Deadline Reminders'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notification_preferences')
    event_type = models.CharField(max_length=30, choices=EVENT_TYPES)
    notification_method = models.CharField(max_length=10, choices=NOTIFICATION_TYPES, default='both')
    is_enabled = models.BooleanField(default=True)
    
    class Meta:
        db_table = 'notification_preferences'
        unique_together = ['user', 'event_type']
        
    def __str__(self):
        return f"{self.user.username} - {self.get_event_type_display()}: {self.get_notification_method_display()}"


class PortalNotification(models.Model):
    """
    Model for in-portal notifications.
    """
    NOTIFICATION_TYPES = [
        ('info', 'Information'),
        ('success', 'Success'),
        ('warning', 'Warning'),
        ('error', 'Error'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='portal_notifications')
    title = models.CharField(max_length=255)
    message = models.TextField()
    notification_type = models.CharField(max_length=10, choices=NOTIFICATION_TYPES, default='info')
    
    # Related objects
    application = models.ForeignKey(GrantApplication, on_delete=models.CASCADE, null=True, blank=True)
    communication = models.ForeignKey(Communication, on_delete=models.CASCADE, null=True, blank=True)
    
    # Status
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    read_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'portal_notifications'
        ordering = ['-created_at']
        
    def __str__(self):
        return f"Notification for {self.user.username}: {self.title}"
    
    def mark_as_read(self):
        """Mark the notification as read."""
        if not self.is_read:
            self.is_read = True
            self.read_at = timezone.now()
            self.save(update_fields=['is_read', 'read_at'])


class EmailTemplate(models.Model):
    """
    Model for email templates used in notifications.
    """
    TEMPLATE_TYPES = [
        ('status_update', 'Status Update'),
        ('new_message', 'New Message'),
        ('assessment_complete', 'Assessment Complete'),
        ('document_request', 'Document Request'),
        ('welcome', 'Welcome Email'),
        ('reminder', 'Reminder Email'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    template_type = models.CharField(max_length=30, choices=TEMPLATE_TYPES)
    subject = models.CharField(max_length=255)
    body = models.TextField(help_text="Use {{variable}} for dynamic content")
    
    # Metadata
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'email_templates'
        ordering = ['name']
        
    def __str__(self):
        return f"{self.name} ({self.get_template_type_display()})"
    
    def render(self, context):
        """Render the template with the given context."""
        from django.template import Template, Context
        
        subject_template = Template(self.subject)
        body_template = Template(self.body)
        
        django_context = Context(context)
        
        return {
            'subject': subject_template.render(django_context),
            'body': body_template.render(django_context)
        }