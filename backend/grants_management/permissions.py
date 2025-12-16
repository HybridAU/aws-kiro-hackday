"""
Custom permissions for role-based access control.
"""
from rest_framework import permissions


class IsOrganizationUser(permissions.BasePermission):
    """
    Permission that allows access only to organization users.
    """
    
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            request.user.is_organization
        )


class IsAdministratorUser(permissions.BasePermission):
    """
    Permission that allows access only to administrator users.
    """
    
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            request.user.is_administrator
        )


class IsOwnerOrAdmin(permissions.BasePermission):
    """
    Permission that allows access to owners or administrators.
    """
    
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated
    
    def has_object_permission(self, request, view, obj):
        # Administrators have full access
        if request.user.is_administrator:
            return True
        
        # Check if user is the owner based on object type
        if hasattr(obj, 'user') and obj.user == request.user:
            return True
        
        if hasattr(obj, 'organization') and request.user.is_organization:
            return obj.organization == request.user.organization
        
        return False


class ReadOnlyOrAdmin(permissions.BasePermission):
    """
    Permission that allows read-only access to authenticated users,
    but write access only to administrators.
    """
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Read permissions for any authenticated user
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # Write permissions only for administrators
        return request.user.is_administrator


class IsOrganizationOwnerOrReadOnlyAdmin(permissions.BasePermission):
    """
    Permission that allows:
    - Organizations to have full access to their own objects
    - Administrators to have read-only access to all objects
    """
    
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated
    
    def has_object_permission(self, request, view, obj):
        # Organizations have full access to their own objects
        if request.user.is_organization:
            if hasattr(obj, 'organization'):
                return obj.organization == request.user.organization
            if hasattr(obj, 'user') and hasattr(obj.user, 'organization'):
                return obj.user.organization == request.user.organization
        
        # Administrators have read-only access
        if request.user.is_administrator:
            return request.method in permissions.SAFE_METHODS
        
        return False


class CanModifyApplication(permissions.BasePermission):
    """
    Permission that checks if a user can modify an application.
    """
    
    def has_object_permission(self, request, view, obj):
        # Only allow modification if application can be edited
        if hasattr(obj, 'can_be_edited') and not obj.can_be_edited():
            return False
        
        # Organizations can only modify their own applications
        if request.user.is_organization:
            return obj.organization == request.user.organization
        
        # Administrators can modify applications in certain statuses
        if request.user.is_administrator:
            return obj.status in ['submitted', 'under_review']
        
        return False


class CanViewSensitiveData(permissions.BasePermission):
    """
    Permission for accessing sensitive data like assessments.
    """
    
    def has_permission(self, request, view):
        # Only administrators can access sensitive data
        return (
            request.user and 
            request.user.is_authenticated and 
            request.user.is_administrator
        )


class IsMessageParticipant(permissions.BasePermission):
    """
    Permission for communication - users can only access messages they're involved in.
    """
    
    def has_object_permission(self, request, view, obj):
        # Check if user is sender or recipient
        if hasattr(obj, 'sender') and hasattr(obj, 'recipient'):
            return request.user in [obj.sender, obj.recipient]
        
        # For threads, check if user is a participant
        if hasattr(obj, 'participants'):
            return obj.participants.filter(id=request.user.id).exists()
        
        return False


class CanAccessApplication(permissions.BasePermission):
    """
    Permission to check if user can access a specific application.
    """
    
    def has_object_permission(self, request, view, obj):
        # Organizations can only access their own applications
        if request.user.is_organization:
            return obj.organization == request.user.organization
        
        # Administrators can access all applications
        if request.user.is_administrator:
            return True
        
        return False


class IsVerifiedUser(permissions.BasePermission):
    """
    Permission that requires email verification.
    """
    
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            request.user.email_verified
        )


class IsActiveUser(permissions.BasePermission):
    """
    Permission that requires active user account.
    """
    
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            request.user.is_active
        )


class DenyAll(permissions.BasePermission):
    """
    Permission that denies all access.
    """
    
    def has_permission(self, request, view):
        return False
    
    def has_object_permission(self, request, view, obj):
        return False