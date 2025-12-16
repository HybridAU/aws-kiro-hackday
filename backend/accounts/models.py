"""
User and Organization models for the grants management system.
"""
import uuid
from django.contrib.auth.models import AbstractUser
from django.db import models
from django.core.validators import RegexValidator


class User(AbstractUser):
    """
    Custom User model extending Django's AbstractUser.
    Supports both organization users and grant administrators.
    """
    ROLE_CHOICES = [
        ('organization', 'Organization'),
        ('administrator', 'Grant Administrator'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    email_verified = models.BooleanField(default=False)
    email_verification_token = models.UUIDField(default=uuid.uuid4, editable=False)
    password_reset_token = models.UUIDField(null=True, blank=True)
    password_reset_expires = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_login = models.DateTimeField(null=True, blank=True)
    
    # Use email as the username field
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username', 'role']
    
    class Meta:
        db_table = 'users'
        
    def __str__(self):
        return f"{self.email} ({self.get_role_display()})"
    
    @property
    def is_organization(self):
        return self.role == 'organization'
    
    @property
    def is_administrator(self):
        return self.role == 'administrator'


class Organization(models.Model):
    """
    Organization model for entities that apply for grants.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='organization')
    name = models.CharField(max_length=255)
    contact_person = models.CharField(max_length=255)
    
    # Phone number validation
    phone_regex = RegexValidator(
        regex=r'^\+?1?\d{9,15}$',
        message="Phone number must be entered in the format: '+999999999'. Up to 15 digits allowed."
    )
    phone = models.CharField(validators=[phone_regex], max_length=17, blank=True)
    
    address = models.TextField()
    registration_number = models.CharField(max_length=100, unique=True, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'organizations'
        
    def __str__(self):
        return self.name
    
    def save(self, *args, **kwargs):
        # Ensure the associated user has the organization role
        if self.user and self.user.role != 'organization':
            self.user.role = 'organization'
            self.user.save()
        super().save(*args, **kwargs)