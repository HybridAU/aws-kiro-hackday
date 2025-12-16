"""
Serializers for audit logging and monitoring.
"""
from rest_framework import serializers
from .models import AuditLog, DataAccessLog, SecurityEvent, SystemHealthLog


class AuditLogSerializer(serializers.ModelSerializer):
    """
    Serializer for audit logs.
    """
    user_name = serializers.CharField(source='user.username', read_only=True)
    action_display = serializers.CharField(source='get_action_display', read_only=True)
    risk_level_display = serializers.CharField(source='get_risk_level_display', read_only=True)
    
    class Meta:
        model = AuditLog
        fields = [
            'id', 'user', 'user_name', 'action', 'action_display',
            'resource_type', 'resource_id', 'old_values', 'new_values',
            'ip_address', 'user_agent', 'request_method', 'request_path',
            'description', 'risk_level', 'risk_level_display', 'success',
            'error_message', 'timestamp', 'checksum'
        ]
        read_only_fields = ['id', 'timestamp', 'checksum']


class AuditLogListSerializer(serializers.ModelSerializer):
    """
    Simplified serializer for audit log lists.
    """
    user_name = serializers.CharField(source='user.username', read_only=True)
    action_display = serializers.CharField(source='get_action_display', read_only=True)
    
    class Meta:
        model = AuditLog
        fields = [
            'id', 'user_name', 'action', 'action_display', 'resource_type',
            'ip_address', 'success', 'timestamp'
        ]


class DataAccessLogSerializer(serializers.ModelSerializer):
    """
    Serializer for data access logs.
    """
    user_name = serializers.CharField(source='user.username', read_only=True)
    access_type_display = serializers.CharField(source='get_access_type_display', read_only=True)
    
    class Meta:
        model = DataAccessLog
        fields = [
            'id', 'user', 'user_name', 'access_type', 'access_type_display',
            'resource_type', 'resource_ids', 'query_params', 'result_count',
            'ip_address', 'user_agent', 'timestamp'
        ]
        read_only_fields = ['id', 'timestamp']


class SecurityEventSerializer(serializers.ModelSerializer):
    """
    Serializer for security events.
    """
    user_name = serializers.CharField(source='user.username', read_only=True)
    event_type_display = serializers.CharField(source='get_event_type_display', read_only=True)
    severity_display = serializers.CharField(source='get_severity_display', read_only=True)
    investigated_by_name = serializers.CharField(source='investigated_by.username', read_only=True)
    
    class Meta:
        model = SecurityEvent
        fields = [
            'id', 'user', 'user_name', 'event_type', 'event_type_display',
            'severity', 'severity_display', 'description', 'additional_data',
            'ip_address', 'user_agent', 'request_path', 'response_status',
            'timestamp', 'investigated', 'investigated_by', 'investigated_by_name',
            'investigation_notes'
        ]
        read_only_fields = ['id', 'timestamp']


class SecurityEventListSerializer(serializers.ModelSerializer):
    """
    Simplified serializer for security event lists.
    """
    user_name = serializers.CharField(source='user.username', read_only=True)
    event_type_display = serializers.CharField(source='get_event_type_display', read_only=True)
    severity_display = serializers.CharField(source='get_severity_display', read_only=True)
    
    class Meta:
        model = SecurityEvent
        fields = [
            'id', 'user_name', 'event_type', 'event_type_display',
            'severity', 'severity_display', 'ip_address', 'timestamp',
            'investigated'
        ]


class SystemHealthLogSerializer(serializers.ModelSerializer):
    """
    Serializer for system health logs.
    """
    metric_type_display = serializers.CharField(source='get_metric_type_display', read_only=True)
    
    class Meta:
        model = SystemHealthLog
        fields = [
            'id', 'metric_type', 'metric_type_display', 'value', 'unit',
            'warning_threshold', 'critical_threshold', 'is_healthy',
            'alert_sent', 'metadata', 'timestamp'
        ]
        read_only_fields = ['id', 'timestamp']


class AuditSummarySerializer(serializers.Serializer):
    """
    Serializer for audit summary statistics.
    """
    total_logs = serializers.IntegerField(read_only=True)
    logs_by_action = serializers.DictField(read_only=True)
    logs_by_user = serializers.DictField(read_only=True)
    logs_by_risk_level = serializers.DictField(read_only=True)
    recent_high_risk_events = serializers.ListField(read_only=True)
    failed_operations = serializers.IntegerField(read_only=True)
    unique_users = serializers.IntegerField(read_only=True)
    unique_ips = serializers.IntegerField(read_only=True)


class SecuritySummarySerializer(serializers.Serializer):
    """
    Serializer for security summary statistics.
    """
    total_events = serializers.IntegerField(read_only=True)
    events_by_type = serializers.DictField(read_only=True)
    events_by_severity = serializers.DictField(read_only=True)
    recent_critical_events = serializers.ListField(read_only=True)
    failed_logins = serializers.IntegerField(read_only=True)
    suspicious_ips = serializers.ListField(read_only=True)
    uninvestigated_events = serializers.IntegerField(read_only=True)


class IntegrityCheckSerializer(serializers.Serializer):
    """
    Serializer for audit log integrity check results.
    """
    total_checked = serializers.IntegerField(read_only=True)
    valid_entries = serializers.IntegerField(read_only=True)
    invalid_entries = serializers.IntegerField(read_only=True)
    integrity_percentage = serializers.FloatField(read_only=True)
    invalid_log_ids = serializers.ListField(read_only=True)


class AuditSearchSerializer(serializers.Serializer):
    """
    Serializer for audit log search parameters.
    """
    user_id = serializers.UUIDField(required=False)
    action = serializers.ChoiceField(choices=AuditLog.ACTION_TYPES, required=False)
    resource_type = serializers.CharField(required=False)
    ip_address = serializers.IPAddressField(required=False)
    start_date = serializers.DateTimeField(required=False)
    end_date = serializers.DateTimeField(required=False)
    risk_level = serializers.ChoiceField(choices=AuditLog.RISK_LEVELS, required=False)
    success = serializers.BooleanField(required=False)
    search_term = serializers.CharField(required=False, max_length=255)


class SecurityEventInvestigationSerializer(serializers.ModelSerializer):
    """
    Serializer for security event investigation.
    """
    class Meta:
        model = SecurityEvent
        fields = ['investigated', 'investigation_notes']
    
    def update(self, instance, validated_data):
        request = self.context.get('request')
        if request and request.user.is_administrator:
            if validated_data.get('investigated') and not instance.investigated:
                validated_data['investigated_by'] = request.user
        return super().update(instance, validated_data)