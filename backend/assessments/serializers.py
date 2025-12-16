"""
Serializers for assessment management.
"""
from rest_framework import serializers
from django.db import transaction
from .models import (
    Assessment, 
    AssessmentCriteria, 
    AssessmentTemplate, 
    AssessmentTemplateCriteria,
    AssessmentReview
)
from applications.serializers import GrantApplicationListSerializer


class AssessmentCriteriaSerializer(serializers.ModelSerializer):
    """
    Serializer for assessment criteria.
    """
    weighted_score = serializers.ReadOnlyField()
    criteria_type_display = serializers.CharField(source='get_criteria_type_display', read_only=True)
    
    class Meta:
        model = AssessmentCriteria
        fields = [
            'id', 'criteria_type', 'criteria_type_display', 'score', 
            'comments', 'weight', 'weighted_score'
        ]
        read_only_fields = ['id']


class AssessmentSerializer(serializers.ModelSerializer):
    """
    Serializer for assessments.
    """
    criteria = AssessmentCriteriaSerializer(many=True, required=False)
    administrator_name = serializers.CharField(source='administrator.username', read_only=True)
    application_title = serializers.CharField(source='application.title', read_only=True)
    application_reference = serializers.CharField(source='application.reference_number', read_only=True)
    recommendation_display = serializers.CharField(source='get_recommendation_display', read_only=True)
    total_weighted_score = serializers.SerializerMethodField()
    
    class Meta:
        model = Assessment
        fields = [
            'id', 'application', 'administrator', 'administrator_name',
            'application_title', 'application_reference', 'score', 'comments',
            'recommendation', 'recommendation_display', 'criteria',
            'total_weighted_score', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'administrator', 'created_at', 'updated_at']
    
    def get_total_weighted_score(self, obj):
        """Calculate total weighted score from all criteria."""
        if not obj.criteria.exists():
            return None
        
        total_weighted = sum(criteria.weighted_score for criteria in obj.criteria.all())
        total_weight = sum(float(criteria.weight) for criteria in obj.criteria.all())
        
        if total_weight > 0:
            return round(total_weighted / total_weight, 2)
        return None
    
    def validate(self, attrs):
        # Ensure application is in reviewable status
        application = attrs.get('application')
        if application and application.status not in ['submitted', 'under_review']:
            raise serializers.ValidationError(
                "Assessments can only be created for submitted or under review applications."
            )
        return attrs
    
    @transaction.atomic
    def create(self, validated_data):
        criteria_data = validated_data.pop('criteria', [])
        
        # Set administrator from request
        request = self.context.get('request')
        if request and request.user.is_administrator:
            validated_data['administrator'] = request.user
        
        assessment = Assessment.objects.create(**validated_data)
        
        # Create criteria
        for criteria_item in criteria_data:
            AssessmentCriteria.objects.create(assessment=assessment, **criteria_item)
        
        return assessment
    
    @transaction.atomic
    def update(self, instance, validated_data):
        criteria_data = validated_data.pop('criteria', [])
        
        # Update assessment
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # Update criteria
        if criteria_data:
            # Clear existing criteria
            instance.criteria.all().delete()
            
            # Create new criteria
            for criteria_item in criteria_data:
                AssessmentCriteria.objects.create(assessment=instance, **criteria_item)
        
        return instance


class AssessmentListSerializer(serializers.ModelSerializer):
    """
    Simplified serializer for assessment lists.
    """
    administrator_name = serializers.CharField(source='administrator.username', read_only=True)
    application_title = serializers.CharField(source='application.title', read_only=True)
    application_reference = serializers.CharField(source='application.reference_number', read_only=True)
    recommendation_display = serializers.CharField(source='get_recommendation_display', read_only=True)
    
    class Meta:
        model = Assessment
        fields = [
            'id', 'application', 'administrator_name', 'application_title',
            'application_reference', 'score', 'recommendation', 
            'recommendation_display', 'created_at'
        ]


class AssessmentTemplateCriteriaSerializer(serializers.ModelSerializer):
    """
    Serializer for assessment template criteria.
    """
    criteria_type_display = serializers.CharField(source='get_criteria_type_display', read_only=True)
    
    class Meta:
        model = AssessmentTemplateCriteria
        fields = [
            'id', 'criteria_type', 'criteria_type_display', 'weight',
            'is_required', 'description'
        ]
        read_only_fields = ['id']


class AssessmentTemplateSerializer(serializers.ModelSerializer):
    """
    Serializer for assessment templates.
    """
    criteria = AssessmentTemplateCriteriaSerializer(many=True, required=False)
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)
    
    class Meta:
        model = AssessmentTemplate
        fields = [
            'id', 'name', 'description', 'is_active', 'criteria',
            'created_by', 'created_by_name', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at']
    
    @transaction.atomic
    def create(self, validated_data):
        criteria_data = validated_data.pop('criteria', [])
        
        # Set created_by from request
        request = self.context.get('request')
        if request and request.user.is_administrator:
            validated_data['created_by'] = request.user
        
        template = AssessmentTemplate.objects.create(**validated_data)
        
        # Create criteria
        for criteria_item in criteria_data:
            AssessmentTemplateCriteria.objects.create(template=template, **criteria_item)
        
        return template
    
    @transaction.atomic
    def update(self, instance, validated_data):
        criteria_data = validated_data.pop('criteria', [])
        
        # Update template
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # Update criteria if provided
        if criteria_data:
            # Clear existing criteria
            instance.criteria.all().delete()
            
            # Create new criteria
            for criteria_item in criteria_data:
                AssessmentTemplateCriteria.objects.create(template=instance, **criteria_item)
        
        return instance


class AssessmentReviewSerializer(serializers.ModelSerializer):
    """
    Serializer for assessment reviews.
    """
    reviewer_name = serializers.CharField(source='reviewer.username', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    assessment_details = AssessmentListSerializer(source='assessment', read_only=True)
    
    class Meta:
        model = AssessmentReview
        fields = [
            'id', 'assessment', 'reviewer', 'reviewer_name', 'status',
            'status_display', 'comments', 'assessment_details', 'reviewed_at'
        ]
        read_only_fields = ['id', 'reviewer', 'reviewed_at']
    
    def validate(self, attrs):
        assessment = attrs.get('assessment')
        request = self.context.get('request')
        
        if request and assessment:
            # Ensure reviewer is not the original assessor
            if request.user == assessment.administrator:
                raise serializers.ValidationError(
                    "You cannot review your own assessment."
                )
        
        return attrs
    
    def create(self, validated_data):
        # Set reviewer from request
        request = self.context.get('request')
        if request and request.user.is_administrator:
            validated_data['reviewer'] = request.user
        
        return super().create(validated_data)


class ApplicationAssessmentSummarySerializer(serializers.Serializer):
    """
    Serializer for application assessment summary.
    """
    application = GrantApplicationListSerializer(read_only=True)
    assessment_count = serializers.IntegerField(read_only=True)
    average_score = serializers.DecimalField(max_digits=4, decimal_places=2, read_only=True)
    recommendations = serializers.DictField(read_only=True)
    latest_assessment = AssessmentListSerializer(read_only=True)