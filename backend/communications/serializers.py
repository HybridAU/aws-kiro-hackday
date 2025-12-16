"""
Serializers for communication management.
"""
from rest_framework import serializers
from django.utils import timezone
from .models import (
    Communication, 
    CommunicationThread, 
    ThreadMessage,
    NotificationPreference,
    PortalNotification,
    EmailTemplate
)
from accounts.serializers import UserSerializer
from applications.serializers import GrantApplicationListSerializer


class CommunicationSerializer(serializers.ModelSerializer):
    """
    Serializer for communications.
    """
    sender_name = serializers.CharField(source='sender.username', read_only=True)
    recipient_name = serializers.CharField(source='recipient.username', read_only=True)
    application_reference = serializers.CharField(source='application.reference_number', read_only=True)
    message_type_display = serializers.CharField(source='get_message_type_display', read_only=True)
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)
    is_read = serializers.ReadOnlyField()
    
    class Meta:
        model = Communication
        fields = [
            'id', 'application', 'sender', 'recipient', 'sender_name',
            'recipient_name', 'application_reference', 'message_type',
            'message_type_display', 'subject', 'message', 'sent_at',
            'read_at', 'is_read', 'is_internal', 'priority', 'priority_display'
        ]
        read_only_fields = ['id', 'sender', 'sent_at', 'read_at']
    
    def validate(self, attrs):
        request = self.context.get('request')
        application = attrs.get('application')
        recipient = attrs.get('recipient')
        
        if request and application:
            # Validate sender has access to the application
            user = request.user
            if user.is_organization and application.organization != user.organization:
                raise serializers.ValidationError(
                    "You can only send messages for your own applications."
                )
            
            # Validate recipient relationship to application
            if recipient.is_organization and recipient.organization != application.organization:
                raise serializers.ValidationError(
                    "Cannot send message to an organization not associated with this application."
                )
        
        return attrs
    
    def create(self, validated_data):
        request = self.context.get('request')
        if request:
            validated_data['sender'] = request.user
        return super().create(validated_data)


class ThreadMessageSerializer(serializers.ModelSerializer):
    """
    Serializer for thread messages.
    """
    sender_name = serializers.CharField(source='sender.username', read_only=True)
    sender_role = serializers.CharField(source='sender.role', read_only=True)
    
    class Meta:
        model = ThreadMessage
        fields = [
            'id', 'sender', 'sender_name', 'sender_role', 'message',
            'sent_at', 'is_internal'
        ]
        read_only_fields = ['id', 'sender', 'sent_at']
    
    def create(self, validated_data):
        request = self.context.get('request')
        if request:
            validated_data['sender'] = request.user
        return super().create(validated_data)


class CommunicationThreadSerializer(serializers.ModelSerializer):
    """
    Serializer for communication threads.
    """
    messages = ThreadMessageSerializer(many=True, read_only=True)
    participants = UserSerializer(many=True, read_only=True)
    application_reference = serializers.CharField(source='application.reference_number', read_only=True)
    latest_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()
    closed_by_name = serializers.CharField(source='closed_by.username', read_only=True)
    
    class Meta:
        model = CommunicationThread
        fields = [
            'id', 'application', 'application_reference', 'subject',
            'participants', 'messages', 'latest_message', 'unread_count',
            'created_at', 'updated_at', 'is_closed', 'closed_by',
            'closed_by_name', 'closed_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'closed_by', 'closed_at']
    
    def get_latest_message(self, obj):
        latest = obj.get_latest_message()
        if latest:
            return ThreadMessageSerializer(latest).data
        return None
    
    def get_unread_count(self, obj):
        request = self.context.get('request')
        if request and request.user:
            return obj.get_unread_count_for_user(request.user)
        return 0


class CommunicationThreadListSerializer(serializers.ModelSerializer):
    """
    Simplified serializer for thread lists.
    """
    application_reference = serializers.CharField(source='application.reference_number', read_only=True)
    participant_count = serializers.SerializerMethodField()
    latest_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()
    
    class Meta:
        model = CommunicationThread
        fields = [
            'id', 'application', 'application_reference', 'subject',
            'participant_count', 'latest_message', 'unread_count',
            'created_at', 'updated_at', 'is_closed'
        ]
    
    def get_participant_count(self, obj):
        return obj.participants.count()
    
    def get_latest_message(self, obj):
        latest = obj.get_latest_message()
        if latest:
            return {
                'sender_name': latest.sender.username,
                'message': latest.message[:100] + '...' if len(latest.message) > 100 else latest.message,
                'sent_at': latest.sent_at
            }
        return None
    
    def get_unread_count(self, obj):
        request = self.context.get('request')
        if request and request.user:
            return obj.get_unread_count_for_user(request.user)
        return 0


class NotificationPreferenceSerializer(serializers.ModelSerializer):
    """
    Serializer for notification preferences.
    """
    event_type_display = serializers.CharField(source='get_event_type_display', read_only=True)
    notification_method_display = serializers.CharField(source='get_notification_method_display', read_only=True)
    
    class Meta:
        model = NotificationPreference
        fields = [
            'id', 'event_type', 'event_type_display', 'notification_method',
            'notification_method_display', 'is_enabled'
        ]
        read_only_fields = ['id']


class PortalNotificationSerializer(serializers.ModelSerializer):
    """
    Serializer for portal notifications.
    """
    notification_type_display = serializers.CharField(source='get_notification_type_display', read_only=True)
    application_reference = serializers.CharField(source='application.reference_number', read_only=True)
    
    class Meta:
        model = PortalNotification
        fields = [
            'id', 'title', 'message', 'notification_type', 'notification_type_display',
            'application', 'application_reference', 'communication', 'is_read',
            'created_at', 'read_at'
        ]
        read_only_fields = ['id', 'created_at', 'read_at']


class EmailTemplateSerializer(serializers.ModelSerializer):
    """
    Serializer for email templates.
    """
    template_type_display = serializers.CharField(source='get_template_type_display', read_only=True)
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)
    
    class Meta:
        model = EmailTemplate
        fields = [
            'id', 'name', 'template_type', 'template_type_display',
            'subject', 'body', 'is_active', 'created_by', 'created_by_name',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at']
    
    def create(self, validated_data):
        request = self.context.get('request')
        if request and request.user.is_administrator:
            validated_data['created_by'] = request.user
        return super().create(validated_data)


class MessageComposeSerializer(serializers.Serializer):
    """
    Serializer for composing new messages.
    """
    recipient_id = serializers.UUIDField()
    subject = serializers.CharField(max_length=255)
    message = serializers.CharField()
    message_type = serializers.ChoiceField(
        choices=Communication.MESSAGE_TYPES,
        default='message'
    )
    priority = serializers.ChoiceField(
        choices=[('low', 'Low'), ('normal', 'Normal'), ('high', 'High')],
        default='normal'
    )
    
    def validate_recipient_id(self, value):
        from accounts.models import User
        try:
            recipient = User.objects.get(id=value)
            return recipient
        except User.DoesNotExist:
            raise serializers.ValidationError("Recipient not found.")
    
    def validate(self, attrs):
        request = self.context.get('request')
        application = self.context.get('application')
        recipient = attrs.get('recipient_id')
        
        if request and application and recipient:
            # Validate sender can message this recipient for this application
            user = request.user
            
            if user.is_organization:
                # Organizations can only message administrators
                if not recipient.is_administrator:
                    raise serializers.ValidationError(
                        "Organizations can only send messages to administrators."
                    )
                # Must be their own application
                if application.organization != user.organization:
                    raise serializers.ValidationError(
                        "You can only send messages for your own applications."
                    )
            elif user.is_administrator:
                # Administrators can message anyone related to the application
                if recipient.is_organization and recipient.organization != application.organization:
                    raise serializers.ValidationError(
                        "Cannot message organization not associated with this application."
                    )
        
        return attrs