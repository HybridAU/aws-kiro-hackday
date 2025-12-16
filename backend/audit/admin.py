"""
Django admin configuration for audit app.
"""
from django.contrib import admin
from .models import AuditLog, DataAccessLog, SecurityEvent, SystemHealthLog, AuditLogArchive


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    """
    Admin interface for Audit Logs.
    """
    list_display = [
        'timestamp', 'user_name', 'action', 'resource_type', 
        'ip_address', 'risk_level', 'success'
    ]
    list_filter = ['action', 'risk_level', 'success', 'timestamp']
    search_fields = [
        'user__username', 'resource_type', 'ip_address', 'description'
    ]
    ordering = ['-timestamp']
    readonly_fields = [
        'id', 'timestamp', 'checksum', 'user', 'session_key',
        'action', 'resource_type', 'resource_id', 'old_values',
        'new_values', 'ip_address', 'user_agent', 'request_method',
        'request_path', 'description', 'risk_level', 'success',
        'error_message'
    ]
    
    # Make all fields read-only to preserve audit integrity
    def has_add_permission(self, request):
        return False
    
    def has_change_permission(self, request, obj=None):
        return False
    
    def has_delete_permission(self, request, obj=None):
        return False
    
    def user_name(self, obj):
        return obj.user.username if obj.user else 'Anonymous'
    user_name.short_description = 'User'
    user_name.admin_order_field = 'user__username'


@admin.register(DataAccessLog)
class DataAccessLogAdmin(admin.ModelAdmin):
    """
    Admin interface for Data Access Logs.
    """
    list_display = [
        'timestamp', 'user_name', 'access_type', 'resource_type',
        'result_count', 'ip_address'
    ]
    list_filter = ['access_type', 'resource_type', 'timestamp']
    search_fields = ['user__username', 'resource_type', 'ip_address']
    ordering = ['-timestamp']
    readonly_fields = [
        'id', 'timestamp', 'user', 'access_type', 'resource_type',
        'resource_ids', 'query_params', 'result_count', 'ip_address',
        'user_agent'
    ]
    
    def has_add_permission(self, request):
        return False
    
    def has_change_permission(self, request, obj=None):
        return False
    
    def has_delete_permission(self, request, obj=None):
        return False
    
    def user_name(self, obj):
        return obj.user.username if obj.user else 'Anonymous'
    user_name.short_description = 'User'
    user_name.admin_order_field = 'user__username'


@admin.register(SecurityEvent)
class SecurityEventAdmin(admin.ModelAdmin):
    """
    Admin interface for Security Events.
    """
    list_display = [
        'timestamp', 'user_name', 'event_type', 'severity',
        'ip_address', 'investigated'
    ]
    list_filter = ['event_type', 'severity', 'investigated', 'timestamp']
    search_fields = [
        'user__username', 'description', 'ip_address', 'request_path'
    ]
    ordering = ['-timestamp']
    readonly_fields = [
        'id', 'timestamp', 'user', 'event_type', 'severity',
        'description', 'additional_data', 'ip_address', 'user_agent',
        'request_path', 'response_status'
    ]
    
    fieldsets = (
        ('Event Information', {
            'fields': ('event_type', 'severity', 'description', 'additional_data')
        }),
        ('User Information', {
            'fields': ('user', 'ip_address', 'user_agent')
        }),
        ('Request Information', {
            'fields': ('request_path', 'response_status')
        }),
        ('Investigation', {
            'fields': ('investigated', 'investigated_by', 'investigation_notes')
        }),
        ('Metadata', {
            'fields': ('id', 'timestamp'),
            'classes': ('collapse',)
        }),
    )
    
    def user_name(self, obj):
        return obj.user.username if obj.user else 'Anonymous'
    user_name.short_description = 'User'
    user_name.admin_order_field = 'user__username'


@admin.register(SystemHealthLog)
class SystemHealthLogAdmin(admin.ModelAdmin):
    """
    Admin interface for System Health Logs.
    """
    list_display = [
        'timestamp', 'metric_type', 'value', 'unit', 'is_healthy', 'alert_sent'
    ]
    list_filter = ['metric_type', 'is_healthy', 'alert_sent', 'timestamp']
    search_fields = ['metric_type']
    ordering = ['-timestamp']
    
    fieldsets = (
        ('Metric Information', {
            'fields': ('metric_type', 'value', 'unit')
        }),
        ('Thresholds', {
            'fields': ('warning_threshold', 'critical_threshold')
        }),
        ('Status', {
            'fields': ('is_healthy', 'alert_sent')
        }),
        ('Additional Data', {
            'fields': ('metadata',)
        }),
        ('Timestamp', {
            'fields': ('timestamp',),
            'classes': ('collapse',)
        }),
    )


@admin.register(AuditLogArchive)
class AuditLogArchiveAdmin(admin.ModelAdmin):
    """
    Admin interface for Audit Log Archives.
    """
    list_display = [
        'archive_date', 'start_date', 'end_date', 'record_count',
        'file_size_mb', 'created_by_name'
    ]
    list_filter = ['archive_date']
    search_fields = ['description', 'created_by__username']
    ordering = ['-archive_date']
    readonly_fields = ['archive_date', 'file_size', 'file_checksum']
    
    def file_size_mb(self, obj):
        return f"{obj.file_size / (1024 * 1024):.2f} MB"
    file_size_mb.short_description = 'File Size'
    
    def created_by_name(self, obj):
        return obj.created_by.username if obj.created_by else 'System'
    created_by_name.short_description = 'Created By'
    created_by_name.admin_order_field = 'created_by__username'