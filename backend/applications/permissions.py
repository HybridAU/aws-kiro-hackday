"""
Custom permissions for application management.
"""
from rest_framework import permissions


class IsOrganizationOwnerOrAdmin(permissions.BasePermission):
    """
    Permission that allows:
    - Organizations to access only their own applications
    - Administrators to access all applications
    """
    
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated
    
    def has_object_permission(self, request, view, obj):
        # Administrators have full access
        if request.user.is_administrator:
            return True
        
        # Organizations can only access their own applications
        if request.user.is_organization:
            return obj.organization == request.user.organization
        
        return False


class IsApplicationOwner(permissions.BasePermission):
    """
    Permission that allows only the application owner to access.
    """
    
    def has_object_permission(self, request, view, obj):
        if request.user.is_organization:
            return obj.organization == request.user.organization
        return False


class IsAdministrator(permissions.BasePermission):
    """
    Permission that allows only administrators.
    """
    
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.is_administrator