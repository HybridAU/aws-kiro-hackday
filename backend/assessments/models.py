"""
Assessment models for grant application review and scoring.
"""
import uuid
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from applications.models import GrantApplication
from accounts.models import User


class Assessment(models.Model):
    """
    Model representing an assessment of a grant application by an administrator.
    """
    RECOMMENDATION_CHOICES = [
        ('approve', 'Approve'),
        ('reject', 'Reject'),
        ('request_info', 'Request More Information'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    application = models.ForeignKey(GrantApplication, on_delete=models.CASCADE, related_name='assessments')
    administrator = models.ForeignKey(User, on_delete=models.CASCADE, related_name='assessments')
    
    # Scoring (1-10 scale)
    score = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(10)],
        help_text="Score from 1 (poor) to 10 (excellent)"
    )
    
    # Assessment details
    comments = models.TextField(help_text="Detailed assessment comments")
    recommendation = models.CharField(max_length=20, choices=RECOMMENDATION_CHOICES)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'assessments'
        ordering = ['-created_at']
        unique_together = ['application', 'administrator']  # One assessment per admin per application
        
    def __str__(self):
        return f"Assessment of {self.application.reference_number} by {self.administrator.username}"
    
    def save(self, *args, **kwargs):
        # Ensure administrator role
        if not self.administrator.is_administrator:
            raise ValueError("Only administrators can create assessments.")
        super().save(*args, **kwargs)


class AssessmentCriteria(models.Model):
    """
    Model for individual assessment criteria with scores.
    """
    CRITERIA_TYPES = [
        ('project_quality', 'Project Quality'),
        ('feasibility', 'Feasibility'),
        ('budget', 'Budget Appropriateness'),
        ('impact', 'Expected Impact'),
        ('organization_capacity', 'Organization Capacity'),
        ('innovation', 'Innovation'),
        ('sustainability', 'Sustainability'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    assessment = models.ForeignKey(Assessment, on_delete=models.CASCADE, related_name='criteria')
    criteria_type = models.CharField(max_length=30, choices=CRITERIA_TYPES)
    score = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(10)],
        help_text="Score from 1 (poor) to 10 (excellent)"
    )
    comments = models.TextField(blank=True, help_text="Comments for this specific criteria")
    weight = models.DecimalField(
        max_digits=3, 
        decimal_places=2, 
        default=1.0,
        validators=[MinValueValidator(0.1), MaxValueValidator(2.0)],
        help_text="Weight multiplier for this criteria (0.1 to 2.0)"
    )
    
    class Meta:
        db_table = 'assessment_criteria'
        unique_together = ['assessment', 'criteria_type']
        
    def __str__(self):
        return f"{self.get_criteria_type_display()}: {self.score}/10"
    
    @property
    def weighted_score(self):
        """Calculate the weighted score for this criteria."""
        return float(self.score) * float(self.weight)


class AssessmentTemplate(models.Model):
    """
    Model for assessment templates with predefined criteria.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    description = models.TextField()
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'assessment_templates'
        ordering = ['name']
        
    def __str__(self):
        return self.name


class AssessmentTemplateCriteria(models.Model):
    """
    Model for criteria defined in assessment templates.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    template = models.ForeignKey(AssessmentTemplate, on_delete=models.CASCADE, related_name='criteria')
    criteria_type = models.CharField(max_length=30, choices=AssessmentCriteria.CRITERIA_TYPES)
    weight = models.DecimalField(
        max_digits=3, 
        decimal_places=2, 
        default=1.0,
        validators=[MinValueValidator(0.1), MaxValueValidator(2.0)]
    )
    is_required = models.BooleanField(default=True)
    description = models.TextField(blank=True)
    
    class Meta:
        db_table = 'assessment_template_criteria'
        unique_together = ['template', 'criteria_type']
        
    def __str__(self):
        return f"{self.template.name} - {self.get_criteria_type_display()}"


class AssessmentReview(models.Model):
    """
    Model for peer review of assessments.
    """
    REVIEW_STATUS_CHOICES = [
        ('pending', 'Pending Review'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('needs_revision', 'Needs Revision'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    assessment = models.ForeignKey(Assessment, on_delete=models.CASCADE, related_name='reviews')
    reviewer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='assessment_reviews')
    status = models.CharField(max_length=20, choices=REVIEW_STATUS_CHOICES, default='pending')
    comments = models.TextField()
    reviewed_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'assessment_reviews'
        ordering = ['-reviewed_at']
        unique_together = ['assessment', 'reviewer']
        
    def __str__(self):
        return f"Review of {self.assessment} by {self.reviewer.username}"
    
    def save(self, *args, **kwargs):
        # Ensure reviewer is an administrator and not the original assessor
        if not self.reviewer.is_administrator:
            raise ValueError("Only administrators can review assessments.")
        if self.reviewer == self.assessment.administrator:
            raise ValueError("Administrators cannot review their own assessments.")
        super().save(*args, **kwargs)