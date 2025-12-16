"""
Django admin configuration for accounts app.
"""
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, Organization


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """
    Admin interface for User model.
    """
    list_display = ['email', 'username', 'role', 'email_verified', 'is_active', 'created_at']
    list_filter = ['role', 'email_verified', 'is_active', 'created_at']
    search_fields = ['email', 'username']
    ordering = ['-created_at']
    
    fieldsets = BaseUserAdmin.fieldsets + (
        ('Custom Fields', {
            'fields': ('role', 'email_verified', 'email_verification_token')
        }),
    )
    
    add_fieldsets = BaseUserAdmin.add_fieldsets + (
        ('Custom Fields', {
            'fields': ('email', 'role')
        }),
    )


@admin.register(Organization)
class OrganizationAdmin(admin.ModelAdmin):
    """
    Admin interface for Organization model.
    """
    list_display = ['name', 'contact_person', 'user_email', 'registration_number', 'created_at']
    list_filter = ['created_at']
    search_fields = ['name', 'contact_person', 'user__email', 'registration_number']
    ordering = ['-created_at']
    
    def user_email(self, obj):
        return obj.user.email
    user_email.short_description = 'Email'
    user_email.admin_order_field = 'user__email'