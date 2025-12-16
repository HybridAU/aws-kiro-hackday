"""
Audit logging models for comprehensive system tracking.
"""
import uuid
import json
import hashlib
from django.db import models
from django.contrib.contenttypes.models import ContentType
from django.contrib.contenttypes.fields import GenericForeignKey
from django.utils import timezone
from accounts.models import User


class AuditLog(models.Model):
    """
    Model for comprehensive audit logging of all system activities.
    """
    ACTION_TYPES = [
        ('create', 'Create'),
        ('read', 'Read'),
        ('update', 'Update'),
        ('delete', 'Delete'),
        ('login', 'Login'),
        ('logout', 'Logout'),
        ('login_failed', 'Login Failed'),
        ('password_change', 'Password Change'),
        ('email_verify', 'Email Verification'),
        ('status_change', 'Status Change'),
        ('file_upload', 'File Upload'),
        ('file_download', 'File Download'),
        ('export', 'Data Export'),
        ('import', 'Data Import'),
        ('admin_action', 'Admin Action'),
    ]
    
    RISK_LEVELS = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('critical', 'Critical'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # User and session information
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    session_key = models.CharField(max_length=40, blank=True)
    
    # Action details
    action = models.CharField(max_length=20, choices=ACTION_TYPES)
    resource_type = models.CharField(max_length=100)  # Model name or resource type
    resource_id = models.CharField(max_length=100, blank=True)  # Object ID
    
    # Generic foreign key for linking to any model
    content_type = models.ForeignKey(ContentType, on_delete=models.SET_NULL, null=True, blank=True)
    object_id = models.CharField(max_length=100, blank=True)
    content_object = GenericForeignKey('content_type', 'object_id')
    
    # Change tracking
    old_values = models.JSONField(null=True, blank=True)
    new_values = models.JSONField(null=True, blank=True)
    
    # Request information
    ip_address = models.GenericIPAddressField()
    user_agent = models.TextField(blank=True)
    request_method = models.CharField(max_length=10, blank=True)
    request_path = models.CharField(max_length=500, blank=True)
    
    # Additional metadata
    description = models.TextField(blank=True)
    risk_level = models.CharField(max_length=10, choices=RISK_LEVELS, default='low')
    success = models.BooleanField(default=True)
    error_message = models.TextField(blank=True)
    
    # Timestamps
    timestamp = models.DateTimeField(auto_now_add=True)
    
    # Integrity fields
    checksum = models.CharField(max_length=64, blank=True)  # SHA-256 hash
    
    class Meta:
        db_table = 'audit_logs'
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['user', 'timestamp']),
            models.Index(fields=['action', 'timestamp']),
            models.Index(fields=['resource_type', 'timestamp']),
            models.Index(fields=['ip_address', 'timestamp']),
            models.Index(fields=['risk_level', 'timestamp']),
        ]
        
    def __str__(self):
        return f"{self.user or 'Anonymous'} - {self.action} - {self.resource_type} at {self.timestamp}"
    
    def save(self, *args, **kwargs):
        # Generate checksum for integrity verification
        if not self.checksum:
            self.checksum = self.generate_checksum()
        super().save(*args, **kwargs)
    
    def generate_checksum(self):
        """Generate SHA-256 checksum for integrity verification."""
        data = {
            'user_id': str(self.user.id) if self.user else '',
            'action': self.action,
            'resource_type': self.resource_type,
            'resource_id': self.resource_id,
            'old_values': self.old_values,
            'new_values': self.new_values,
            'ip_address': str(self.ip_address),
            'timestamp': self.timestamp.isoformat() if self.timestamp else timezone.now().isoformat(),
        }
        
        data_string = json.dumps(data, sort_keys=True, default=str)
        return hashlib.sha256(data_string.encode()).hexdigest()
    
    def verify_integrity(self):
        """Verify the integrity of this audit log entry."""
        expected_checksum = self.generate_checksum()
        return self.checksum == expected_checksum
    
    @classmethod
    def log_action(cls, user, action, resource_type, resource_id='', old_values=None, 
                   new_values=None, request=None, description='', risk_level='low', 
                   success=True, error_message='', content_object=None):
        """
        Convenience method to create audit log entries.
        """
        # Extract request information
        ip_address = '127.0.0.1'
        user_agent = ''
        request_method = ''
        request_path = ''
        session_key = ''
        
        if request:
            ip_address = cls.get_client_ip(request)
            user_agent = request.META.get('HTTP_USER_AGENT', '')[:500]
            request_method = request.method
            request_path = request.path[:500]
            session_key = request.session.session_key or ''
        
        # Create content type and object id if content_object is provided
        content_type = None
        object_id = ''
        if content_object:
            content_type = ContentType.objects.get_for_model(content_object)
            object_id = str(content_object.pk)
        
        return cls.objects.create(
            user=user,
            session_key=session_key,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            content_type=content_type,
            object_id=object_id,
            old_values=old_values,
            new_values=new_values,
            ip_address=ip_address,
            user_agent=user_agent,
            request_method=request_method,
            request_path=request_path,
            description=description,
            risk_level=risk_level,
            success=success,
            error_message=error_message,
        )
    
    @staticmethod
    def get_client_ip(request):
        """Extract client IP address from request."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR', '127.0.0.1')
        return ip


class DataAccessLog(models.Model):
    """
    Model for logging data access events.
    """
    ACCESS_TYPES = [
        ('view', 'View'),
        ('list', 'List'),
        ('search', 'Search'),
        ('export', 'Export'),
        ('download', 'Download'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    access_type = models.CharField(max_length=20, choices=ACCESS_TYPES)
    
    # Resource information
    resource_type = models.CharField(max_length=100)
    resource_ids = models.JSONField(default=list)  # List of accessed resource IDs
    
    # Query information
    query_params = models.JSONField(null=True, blank=True)
    result_count = models.PositiveIntegerField(default=0)
    
    # Request information
    ip_address = models.GenericIPAddressField()
    user_agent = models.TextField(blank=True)
    
    # Timestamps
    timestamp = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'data_access_logs'
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['user', 'timestamp']),
            models.Index(fields=['resource_type', 'timestamp']),
            models.Index(fields=['access_type', 'timestamp']),
        ]
        
    def __str__(self):
        return f"{self.user or 'Anonymous'} - {self.access_type} - {self.resource_type}"


class SecurityEvent(models.Model):
    """
    Model for logging security-related events.
    """
    EVENT_TYPES = [
        ('login_success', 'Successful Login'),
        ('login_failure', 'Failed Login'),
        ('login_blocked', 'Blocked Login Attempt'),
        ('password_change', 'Password Changed'),
        ('password_reset', 'Password Reset'),
        ('email_change', 'Email Changed'),
        ('account_locked', 'Account Locked'),
        ('account_unlocked', 'Account Unlocked'),
        ('permission_denied', 'Permission Denied'),
        ('suspicious_activity', 'Suspicious Activity'),
        ('data_breach_attempt', 'Data Breach Attempt'),
        ('unauthorized_access', 'Unauthorized Access'),
        ('session_hijack', 'Session Hijacking Attempt'),
        ('csrf_attack', 'CSRF Attack'),
        ('sql_injection', 'SQL Injection Attempt'),
        ('xss_attempt', 'XSS Attack Attempt'),
    ]
    
    SEVERITY_LEVELS = [
        ('info', 'Information'),
        ('warning', 'Warning'),
        ('error', 'Error'),
        ('critical', 'Critical'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    event_type = models.CharField(max_length=30, choices=EVENT_TYPES)
    severity = models.CharField(max_length=10, choices=SEVERITY_LEVELS)
    
    # Event details
    description = models.TextField()
    additional_data = models.JSONField(null=True, blank=True)
    
    # Request information
    ip_address = models.GenericIPAddressField()
    user_agent = models.TextField(blank=True)
    request_path = models.CharField(max_length=500, blank=True)
    
    # Response information
    response_status = models.PositiveIntegerField(null=True, blank=True)
    
    # Timestamps
    timestamp = models.DateTimeField(auto_now_add=True)
    
    # Investigation status
    investigated = models.BooleanField(default=False)
    investigated_by = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='investigated_security_events'
    )
    investigation_notes = models.TextField(blank=True)
    
    class Meta:
        db_table = 'security_events'
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['event_type', 'timestamp']),
            models.Index(fields=['severity', 'timestamp']),
            models.Index(fields=['ip_address', 'timestamp']),
            models.Index(fields=['investigated', 'timestamp']),
        ]
        
    def __str__(self):
        return f"{self.event_type} - {self.severity} - {self.timestamp}"


class AuditLogArchive(models.Model):
    """
    Model for archived audit logs (for long-term retention).
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    archive_date = models.DateTimeField(auto_now_add=True)
    start_date = models.DateTimeField()
    end_date = models.DateTimeField()
    
    # Archive file information
    file_path = models.CharField(max_length=500)
    file_size = models.PositiveIntegerField()  # Size in bytes
    record_count = models.PositiveIntegerField()
    
    # Integrity verification
    file_checksum = models.CharField(max_length=64)  # SHA-256 hash of archive file
    
    # Metadata
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    description = models.TextField(blank=True)
    
    class Meta:
        db_table = 'audit_log_archives'
        ordering = ['-archive_date']
        
    def __str__(self):
        return f"Archive {self.start_date.date()} to {self.end_date.date()}"


class SystemHealthLog(models.Model):
    """
    Model for logging system health and performance metrics.
    """
    METRIC_TYPES = [
        ('cpu_usage', 'CPU Usage'),
        ('memory_usage', 'Memory Usage'),
        ('disk_usage', 'Disk Usage'),
        ('database_connections', 'Database Connections'),
        ('response_time', 'Response Time'),
        ('error_rate', 'Error Rate'),
        ('active_users', 'Active Users'),
        ('failed_logins', 'Failed Logins'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    metric_type = models.CharField(max_length=30, choices=METRIC_TYPES)
    value = models.FloatField()
    unit = models.CharField(max_length=20, blank=True)  # %, MB, seconds, etc.
    
    # Thresholds
    warning_threshold = models.FloatField(null=True, blank=True)
    critical_threshold = models.FloatField(null=True, blank=True)
    
    # Status
    is_healthy = models.BooleanField(default=True)
    alert_sent = models.BooleanField(default=False)
    
    # Additional data
    metadata = models.JSONField(null=True, blank=True)
    
    # Timestamps
    timestamp = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'system_health_logs'
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['metric_type', 'timestamp']),
            models.Index(fields=['is_healthy', 'timestamp']),
        ]
        
    def __str__(self):
        return f"{self.metric_type}: {self.value}{self.unit} at {self.timestamp}"