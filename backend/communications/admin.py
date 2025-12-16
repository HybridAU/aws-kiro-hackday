"""
Django admin configuration for communications app.
"""
from django.contrib import admin
from .models import (
    Communication, 
    CommunicationThread, 
    ThreadMessage,
    NotificationPreference,
    PortalNotification,
    EmailTemplate
)


@admin.register(Communication)
class CommunicationAdmin(admin.ModelAdmin):
    """
    Admin interface for Communications.
    """
    list_display = [
        'subject', 'sender_name', 'recipient_name', 'application_reference',
        'message_type', 'priority', 'is_read', 'sent_at'
    ]
    list_filter = ['message_type', 'priority', 'is_internal', 'sent_at']
    search_fields = [
        'subject', 'sender__username', 'recipient__username',
        'application__reference_number'
    ]
    ordering = ['-sent_at']
    readonly_fields = ['sent_at', 'read_at']
    
    fieldsets = (
        ('Message Details', {
            'fields': ('application', 'sender', 'recipient', 'subject', 'message')
        }),
        ('Classification', {
            'fields': ('message_type', 'priority', 'is_internal')
        }),
        ('Timestamps', {
            'fields': ('sent_at', 'read_at'),
            'classes': ('collapse',)
        }),
    )
    
    def sender_name(self, obj):
        return obj.sender.username
    sender_name.short_description = 'Sender'
    sender_name.admin_order_field = 'sender__username'
    
    def recipient_name(self, obj):
        return obj.recipient.username
    recipient_name.short_description = 'Recipient'
    recipient_name.admin_order_field = 'recipient__username'
    
    def application_reference(self, obj):
        return obj.application.reference_number
    application_reference.short_description = 'Application'
    application_reference.admin_order_field = 'application__reference_number'


class ThreadMessageInline(admin.TabularInline):
    """
    Inline admin for thread messages.
    """
    model = ThreadMessage
    extra = 0
    readonly_fields = ['sent_at']


@admin.register(CommunicationThread)
class CommunicationThreadAdmin(admin.ModelAdmin):
    """
    Admin interface for Communication Threads.
    """
    list_display = [
        'subject', 'application_reference', 'participant_count',
        'is_closed', 'created_at', 'updated_at'
    ]
    list_filter = ['is_closed', 'created_at']
    search_fields = ['subject', 'application__reference_number']
    ordering = ['-updated_at']
    readonly_fields = ['created_at', 'updated_at', 'closed_at']
    
    inlines = [ThreadMessageInline]
    
    def application_reference(self, obj):
        return obj.application.reference_number
    application_reference.short_description = 'Application'
    application_reference.admin_order_field = 'application__reference_number'
    
    def participant_count(self, obj):
        return obj.participants.count()
    participant_count.short_description = 'Participants'


@admin.register(ThreadMessage)
class ThreadMessageAdmin(admin.ModelAdmin):
    """
    Admin interface for Thread Messages.
    """
    list_display = [
        'thread_subject', 'sender_name', 'message_preview', 'is_internal', 'sent_at'
    ]
    list_filter = ['is_internal', 'sent_at']
    search_fields = ['thread__subject', 'sender__username', 'message']
    ordering = ['-sent_at']
    readonly_fields = ['sent_at']
    
    def thread_subject(self, obj):
        return obj.thread.subject
    thread_subject.short_description = 'Thread'
    thread_subject.admin_order_field = 'thread__subject'
    
    def sender_name(self, obj):
        return obj.sender.username
    sender_name.short_description = 'Sender'
    sender_name.admin_order_field = 'sender__username'
    
    def message_preview(self, obj):
        return obj.message[:50] + '...' if len(obj.message) > 50 else obj.message
    message_preview.short_description = 'Message'


@admin.register(NotificationPreference)
class NotificationPreferenceAdmin(admin.ModelAdmin):
    """
    Admin interface for Notification Preferences.
    """
    list_display = [
        'user_name', 'event_type', 'notification_method', 'is_enabled'
    ]
    list_filter = ['event_type', 'notification_method', 'is_enabled']
    search_fields = ['user__username', 'user__email']
    ordering = ['user__username', 'event_type']
    
    def user_name(self, obj):
        return obj.user.username
    user_name.short_description = 'User'
    user_name.admin_order_field = 'user__username'


@admin.register(PortalNotification)
class PortalNotificationAdmin(admin.ModelAdmin):
    """
    Admin interface for Portal Notifications.
    """
    list_display = [
        'title', 'user_name', 'notification_type', 'is_read', 'created_at'
    ]
    list_filter = ['notification_type', 'is_read', 'created_at']
    search_fields = ['title', 'user__username', 'message']
    ordering = ['-created_at']
    readonly_fields = ['created_at', 'read_at']
    
    def user_name(self, obj):
        return obj.user.username
    user_name.short_description = 'User'
    user_name.admin_order_field = 'user__username'


@admin.register(EmailTemplate)
class EmailTemplateAdmin(admin.ModelAdmin):
    """
    Admin interface for Email Templates.
    """
    list_display = [
        'name', 'template_type', 'is_active', 'created_by_name', 'created_at'
    ]
    list_filter = ['template_type', 'is_active', 'created_at']
    search_fields = ['name', 'subject', 'created_by__username']
    ordering = ['name']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('Template Details', {
            'fields': ('name', 'template_type', 'is_active')
        }),
        ('Email Content', {
            'fields': ('subject', 'body')
        }),
        ('Metadata', {
            'fields': ('created_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def created_by_name(self, obj):
        return obj.created_by.username if obj.created_by else 'System'
    created_by_name.short_description = 'Created By'
    created_by_name.admin_order_field = 'created_by__username'