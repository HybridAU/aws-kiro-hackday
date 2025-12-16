"""
Grant application models for the grants management system.
"""
import uuid
import string
import random
from django.db import models
from django.core.validators import MinValueValidator
from accounts.models import Organization


class GrantApplication(models.Model):
    """
    Model representing a grant application submitted by an organization.
    """
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('submitted', 'Submitted'),
        ('under_review', 'Under Review'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='applications')
    reference_number = models.CharField(max_length=20, unique=True, blank=True)
    
    # Application details
    title = models.CharField(max_length=255)
    description = models.TextField()
    requested_amount = models.DecimalField(
        max_digits=12, 
        decimal_places=2,
        validators=[MinValueValidator(0.01)]
    )
    project_start_date = models.DateField()
    project_end_date = models.DateField()
    
    # Status and workflow
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    submitted_at = models.DateTimeField(null=True, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'grant_applications'
        ordering = ['-created_at']
        
    def __str__(self):
        return f"{self.reference_number or 'DRAFT'} - {self.title}"
    
    def save(self, *args, **kwargs):
        # Generate reference number when status changes to submitted
        if self.status == 'submitted' and not self.reference_number:
            self.reference_number = self.generate_reference_number()
        super().save(*args, **kwargs)
    
    def generate_reference_number(self):
        """Generate a unique reference number for the application."""
        while True:
            # Format: GA-YYYY-XXXXXX (GA = Grant Application, YYYY = year, XXXXXX = random)
            year = self.created_at.year
            random_part = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
            reference = f"GA-{year}-{random_part}"
            
            if not GrantApplication.objects.filter(reference_number=reference).exists():
                return reference
    
    def can_be_edited(self):
        """Check if the application can be edited."""
        return self.status in ['draft', 'under_review']
    
    def can_be_submitted(self):
        """Check if the application can be submitted."""
        return self.status == 'draft' and self.is_complete()
    
    def is_complete(self):
        """Check if all required fields are filled."""
        required_fields = [
            self.title,
            self.description,
            self.requested_amount,
            self.project_start_date,
            self.project_end_date,
        ]
        return all(field for field in required_fields)
    
    def get_missing_fields(self):
        """Get list of missing required fields."""
        missing = []
        if not self.title:
            missing.append('title')
        if not self.description:
            missing.append('description')
        if not self.requested_amount:
            missing.append('requested_amount')
        if not self.project_start_date:
            missing.append('project_start_date')
        if not self.project_end_date:
            missing.append('project_end_date')
        return missing


class ApplicationDocument(models.Model):
    """
    Model for documents attached to grant applications.
    """
    DOCUMENT_TYPES = [
        ('proposal', 'Project Proposal'),
        ('budget', 'Budget Document'),
        ('financial', 'Financial Statements'),
        ('legal', 'Legal Documents'),
        ('other', 'Other'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    application = models.ForeignKey(GrantApplication, on_delete=models.CASCADE, related_name='documents')
    document_type = models.CharField(max_length=20, choices=DOCUMENT_TYPES)
    name = models.CharField(max_length=255)
    file = models.FileField(upload_to='application_documents/')
    file_size = models.PositiveIntegerField()  # Size in bytes
    uploaded_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'application_documents'
        ordering = ['-uploaded_at']
        
    def __str__(self):
        return f"{self.name} ({self.get_document_type_display()})"
    
    def save(self, *args, **kwargs):
        if self.file:
            self.file_size = self.file.size
        super().save(*args, **kwargs)


class ApplicationStatusHistory(models.Model):
    """
    Model to track status changes for grant applications.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    application = models.ForeignKey(GrantApplication, on_delete=models.CASCADE, related_name='status_history')
    previous_status = models.CharField(max_length=20, choices=GrantApplication.STATUS_CHOICES, null=True, blank=True)
    new_status = models.CharField(max_length=20, choices=GrantApplication.STATUS_CHOICES)
    changed_by = models.ForeignKey('accounts.User', on_delete=models.SET_NULL, null=True)
    reason = models.TextField(blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'application_status_history'
        ordering = ['-timestamp']
        
    def __str__(self):
        return f"{self.application.reference_number}: {self.previous_status} → {self.new_status}"