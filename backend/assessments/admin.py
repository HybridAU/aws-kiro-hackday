"""
Django admin configuration for assessments app.
"""
from django.contrib import admin
from .models import (
    Assessment, 
    AssessmentCriteria, 
    AssessmentTemplate, 
    AssessmentTemplateCriteria,
    AssessmentReview
)


class AssessmentCriteriaInline(admin.TabularInline):
    """
    Inline admin for assessment criteria.
    """
    model = AssessmentCriteria
    extra = 0


@admin.register(Assessment)
class AssessmentAdmin(admin.ModelAdmin):
    """
    Admin interface for Assessments.
    """
    list_display = [
        'application_reference', 'administrator_name', 'score', 
        'recommendation', 'created_at'
    ]
    list_filter = ['recommendation', 'created_at', 'score']
    search_fields = [
        'application__reference_number', 'application__title', 
        'administrator__username'
    ]
    ordering = ['-created_at']
    readonly_fields = ['created_at', 'updated_at']
    
    inlines = [AssessmentCriteriaInline]
    
    fieldsets = (
        ('Assessment Details', {
            'fields': ('application', 'administrator', 'score', 'recommendation')
        }),
        ('Comments', {
            'fields': ('comments',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def application_reference(self, obj):
        return obj.application.reference_number
    application_reference.short_description = 'Application'
    application_reference.admin_order_field = 'application__reference_number'
    
    def administrator_name(self, obj):
        return obj.administrator.username
    administrator_name.short_description = 'Administrator'
    administrator_name.admin_order_field = 'administrator__username'


@admin.register(AssessmentCriteria)
class AssessmentCriteriaAdmin(admin.ModelAdmin):
    """
    Admin interface for Assessment Criteria.
    """
    list_display = [
        'assessment_reference', 'criteria_type', 'score', 'weight', 'weighted_score'
    ]
    list_filter = ['criteria_type', 'score']
    search_fields = ['assessment__application__reference_number']
    ordering = ['assessment', 'criteria_type']
    
    def assessment_reference(self, obj):
        return obj.assessment.application.reference_number
    assessment_reference.short_description = 'Application'
    assessment_reference.admin_order_field = 'assessment__application__reference_number'


class AssessmentTemplateCriteriaInline(admin.TabularInline):
    """
    Inline admin for assessment template criteria.
    """
    model = AssessmentTemplateCriteria
    extra = 0


@admin.register(AssessmentTemplate)
class AssessmentTemplateAdmin(admin.ModelAdmin):
    """
    Admin interface for Assessment Templates.
    """
    list_display = ['name', 'is_active', 'created_by_name', 'created_at']
    list_filter = ['is_active', 'created_at']
    search_fields = ['name', 'description', 'created_by__username']
    ordering = ['name']
    readonly_fields = ['created_at', 'updated_at']
    
    inlines = [AssessmentTemplateCriteriaInline]
    
    fieldsets = (
        ('Template Details', {
            'fields': ('name', 'description', 'is_active')
        }),
        ('Metadata', {
            'fields': ('created_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def created_by_name(self, obj):
        return obj.created_by.username
    created_by_name.short_description = 'Created By'
    created_by_name.admin_order_field = 'created_by__username'


@admin.register(AssessmentTemplateCriteria)
class AssessmentTemplateCriteriaAdmin(admin.ModelAdmin):
    """
    Admin interface for Assessment Template Criteria.
    """
    list_display = ['template_name', 'criteria_type', 'weight', 'is_required']
    list_filter = ['criteria_type', 'is_required']
    search_fields = ['template__name']
    ordering = ['template', 'criteria_type']
    
    def template_name(self, obj):
        return obj.template.name
    template_name.short_description = 'Template'
    template_name.admin_order_field = 'template__name'


@admin.register(AssessmentReview)
class AssessmentReviewAdmin(admin.ModelAdmin):
    """
    Admin interface for Assessment Reviews.
    """
    list_display = [
        'assessment_reference', 'reviewer_name', 'status', 'reviewed_at'
    ]
    list_filter = ['status', 'reviewed_at']
    search_fields = [
        'assessment__application__reference_number', 'reviewer__username'
    ]
    ordering = ['-reviewed_at']
    readonly_fields = ['reviewed_at']
    
    def assessment_reference(self, obj):
        return obj.assessment.application.reference_number
    assessment_reference.short_description = 'Application'
    assessment_reference.admin_order_field = 'assessment__application__reference_number'
    
    def reviewer_name(self, obj):
        return obj.reviewer.username
    reviewer_name.short_description = 'Reviewer'
    reviewer_name.admin_order_field = 'reviewer__username'