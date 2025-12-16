"""
Serializers for grant application management.
"""
from rest_framework import serializers
from django.utils import timezone
from .models import GrantApplication, ApplicationDocument, ApplicationStatusHistory
from accounts.serializers import OrganizationSerializer


class ApplicationDocumentSerializer(serializers.ModelSerializer):
    """
    Serializer for application documents.
    """
    file_url = serializers.SerializerMethodField()
    
    class Meta:
        model = ApplicationDocument
        fields = ['id', 'document_type', 'name', 'file', 'file_url', 'file_size', 'uploaded_at']
        read_only_fields = ['id', 'file_size', 'uploaded_at']
    
    def get_file_url(self, obj):
        if obj.file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.file.url)
        return None


class ApplicationStatusHistorySerializer(serializers.ModelSerializer):
    """
    Serializer for application status history.
    """
    changed_by_name = serializers.SerializerMethodField()
    
    class Meta:
        model = ApplicationStatusHistory
        fields = ['id', 'previous_status', 'new_status', 'changed_by', 'changed_by_name', 'reason', 'timestamp']
        read_only_fields = ['id', 'timestamp']
    
    def get_changed_by_name(self, obj):
        if obj.changed_by:
            return obj.changed_by.username
        return None


class GrantApplicationSerializer(serializers.ModelSerializer):
    """
    Serializer for grant applications.
    """
    organization = OrganizationSerializer(read_only=True)
    documents = ApplicationDocumentSerializer(many=True, read_only=True)
    status_history = ApplicationStatusHistorySerializer(many=True, read_only=True)
    can_be_edited = serializers.SerializerMethodField()
    can_be_submitted = serializers.SerializerMethodField()
    is_complete = serializers.SerializerMethodField()
    missing_fields = serializers.SerializerMethodField()
    
    class Meta:
        model = GrantApplication
        fields = [
            'id', 'organization', 'reference_number', 'title', 'description',
            'requested_amount', 'project_start_date', 'project_end_date',
            'status', 'submitted_at', 'created_at', 'updated_at',
            'documents', 'status_history', 'can_be_edited', 'can_be_submitted',
            'is_complete', 'missing_fields'
        ]
        read_only_fields = ['id', 'reference_number', 'submitted_at', 'created_at', 'updated_at']
    
    def get_can_be_edited(self, obj):
        return obj.can_be_edited()
    
    def get_can_be_submitted(self, obj):
        return obj.can_be_submitted()
    
    def get_is_complete(self, obj):
        return obj.is_complete()
    
    def get_missing_fields(self, obj):
        return obj.get_missing_fields()
    
    def validate(self, attrs):
        # Validate project dates
        if attrs.get('project_start_date') and attrs.get('project_end_date'):
            if attrs['project_start_date'] >= attrs['project_end_date']:
                raise serializers.ValidationError("Project end date must be after start date.")
        
        return attrs
    
    def create(self, validated_data):
        # Set organization from request user
        request = self.context.get('request')
        if request and request.user.is_organization:
            validated_data['organization'] = request.user.organization
        return super().create(validated_data)


class GrantApplicationListSerializer(serializers.ModelSerializer):
    """
    Simplified serializer for application lists.
    """
    organization_name = serializers.SerializerMethodField()
    
    class Meta:
        model = GrantApplication
        fields = [
            'id', 'reference_number', 'title', 'requested_amount',
            'status', 'submitted_at', 'created_at', 'organization_name'
        ]
    
    def get_organization_name(self, obj):
        return obj.organization.name


class ApplicationSubmissionSerializer(serializers.Serializer):
    """
    Serializer for application submission.
    """
    def validate(self, attrs):
        application = self.instance
        if not application.can_be_submitted():
            if not application.is_complete():
                missing_fields = application.get_missing_fields()
                raise serializers.ValidationError(
                    f"Application is incomplete. Missing fields: {', '.join(missing_fields)}"
                )
            else:
                raise serializers.ValidationError("Application cannot be submitted in its current status.")
        return attrs


class ApplicationStatusUpdateSerializer(serializers.Serializer):
    """
    Serializer for updating application status (admin only).
    """
    STATUS_CHOICES = [
        ('under_review', 'Under Review'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]
    
    status = serializers.ChoiceField(choices=STATUS_CHOICES)
    reason = serializers.CharField(required=False, allow_blank=True)
    
    def validate_status(self, value):
        application = self.instance
        current_status = application.status
        
        # Define valid status transitions
        valid_transitions = {
            'submitted': ['under_review', 'rejected'],
            'under_review': ['approved', 'rejected'],
        }
        
        if current_status not in valid_transitions:
            raise serializers.ValidationError(f"Cannot change status from {current_status}")
        
        if value not in valid_transitions[current_status]:
            raise serializers.ValidationError(
                f"Invalid status transition from {current_status} to {value}"
            )
        
        return value