"""
Django admin configuration for applications app.
"""
from django.contrib import admin
from .models import GrantApplication, ApplicationDocument, ApplicationStatusHistory


class ApplicationDocumentInline(admin.TabularInline):
    """
    Inline admin for application documents.
    """
    model = ApplicationDocument
    extra = 0
    readonly_fields = ['file_size', 'uploaded_at']


class ApplicationStatusHistoryInline(admin.TabularInline):
    """
    Inline admin for application status history.
    """
    model = ApplicationStatusHistory
    extra = 0
    readonly_fields = ['timestamp']


@admin.register(GrantApplication)
class GrantApplicationAdmin(admin.ModelAdmin):
    """
    Admin interface for Grant Applications.
    """
    list_display = [
        'reference_number', 'title', 'organization_name', 'requested_amount',
        'status', 'submitted_at', 'created_at'
    ]
    list_filter = ['status', 'submitted_at', 'created_at']
    search_fields = ['reference_number', 'title', 'organization__name']
    ordering = ['-created_at']
    readonly_fields = ['reference_number', 'created_at', 'updated_at']
    
    inlines = [ApplicationDocumentInline, ApplicationStatusHistoryInline]
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('reference_number', 'organization', 'title', 'description')
        }),
        ('Project Details', {
            'fields': ('requested_amount', 'project_start_date', 'project_end_date')
        }),
        ('Status', {
            'fields': ('status', 'submitted_at')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def organization_name(self, obj):
        return obj.organization.name
    organization_name.short_description = 'Organization'
    organization_name.admin_order_field = 'organization__name'


@admin.register(ApplicationDocument)
class ApplicationDocumentAdmin(admin.ModelAdmin):
    """
    Admin interface for Application Documents.
    """
    list_display = ['name', 'application_reference', 'document_type', 'file_size', 'uploaded_at']
    list_filter = ['document_type', 'uploaded_at']
    search_fields = ['name', 'application__reference_number', 'application__title']
    ordering = ['-uploaded_at']
    readonly_fields = ['file_size', 'uploaded_at']
    
    def application_reference(self, obj):
        return obj.application.reference_number or 'DRAFT'
    application_reference.short_description = 'Application'
    application_reference.admin_order_field = 'application__reference_number'


@admin.register(ApplicationStatusHistory)
class ApplicationStatusHistoryAdmin(admin.ModelAdmin):
    """
    Admin interface for Application Status History.
    """
    list_display = ['application_reference', 'previous_status', 'new_status', 'changed_by', 'timestamp']
    list_filter = ['new_status', 'timestamp']
    search_fields = ['application__reference_number', 'changed_by__username']
    ordering = ['-timestamp']
    readonly_fields = ['timestamp']
    
    def application_reference(self, obj):
        return obj.application.reference_number or 'DRAFT'
    application_reference.short_description = 'Application'
    application_reference.admin_order_field = 'application__reference_number'