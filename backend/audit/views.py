"""
Views for audit logging and monitoring.
"""
from django.db.models import Count, Q
from django.utils import timezone
from datetime import timedelta
from rest_framework import generics, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.viewsets import ReadOnlyModelViewSet, ModelViewSet
from applications.permissions import IsAdministrator
from .models import AuditLog, DataAccessLog, SecurityEvent, SystemHealthLog
from .serializers import (
    AuditLogSerializer,
    AuditLogListSerializer,
    DataAccessLogSerializer,
    SecurityEventSerializer,
    SecurityEventListSerializer,
    SystemHealthLogSerializer,
    AuditSummarySerializer,
    SecuritySummarySerializer,
    IntegrityCheckSerializer,
    AuditSearchSerializer,
    SecurityEventInvestigationSerializer
)


class AuditLogViewSet(ReadOnlyModelViewSet):
    """
    ViewSet for audit log viewing (admin only).
    """
    permission_classes = [permissions.IsAuthenticated, IsAdministrator]
    
    def get_serializer_class(self):
        if self.action == 'list':
            return AuditLogListSerializer
        return AuditLogSerializer
    
    def get_queryset(self):
        queryset = AuditLog.objects.select_related('user')
        
        # Apply filters
        user_id = self.request.query_params.get('user_id')
        if user_id:
            queryset = queryset.filter(user_id=user_id)
        
        action = self.request.query_params.get('action')
        if action:
            queryset = queryset.filter(action=action)
        
        resource_type = self.request.query_params.get('resource_type')
        if resource_type:
            queryset = queryset.filter(resource_type=resource_type)
        
        ip_address = self.request.query_params.get('ip_address')
        if ip_address:
            queryset = queryset.filter(ip_address=ip_address)
        
        risk_level = self.request.query_params.get('risk_level')
        if risk_level:
            queryset = queryset.filter(risk_level=risk_level)
        
        success = self.request.query_params.get('success')
        if success is not None:
            queryset = queryset.filter(success=success.lower() == 'true')
        
        # Date range filtering
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        
        if start_date:
            queryset = queryset.filter(timestamp__gte=start_date)
        if end_date:
            queryset = queryset.filter(timestamp__lte=end_date)
        
        # Search in description
        search_term = self.request.query_params.get('search')
        if search_term:
            queryset = queryset.filter(
                Q(description__icontains=search_term) |
                Q(resource_type__icontains=search_term) |
                Q(user__username__icontains=search_term)
            )
        
        return queryset
    
    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Get audit log summary statistics."""
        # Date range for summary (default: last 30 days)
        end_date = timezone.now()
        start_date = end_date - timedelta(days=30)
        
        queryset = AuditLog.objects.filter(timestamp__gte=start_date)
        
        # Basic counts
        total_logs = queryset.count()
        failed_operations = queryset.filter(success=False).count()
        unique_users = queryset.values('user').distinct().count()
        unique_ips = queryset.values('ip_address').distinct().count()
        
        # Logs by action
        logs_by_action = dict(
            queryset.values('action').annotate(count=Count('id')).values_list('action', 'count')
        )
        
        # Logs by user (top 10)
        logs_by_user = dict(
            queryset.filter(user__isnull=False)
            .values('user__username')
            .annotate(count=Count('id'))
            .order_by('-count')[:10]
            .values_list('user__username', 'count')
        )
        
        # Logs by risk level
        logs_by_risk_level = dict(
            queryset.values('risk_level').annotate(count=Count('id')).values_list('risk_level', 'count')
        )
        
        # Recent high-risk events
        recent_high_risk = AuditLogListSerializer(
            queryset.filter(risk_level__in=['high', 'critical']).order_by('-timestamp')[:10],
            many=True
        ).data
        
        summary_data = {
            'total_logs': total_logs,
            'logs_by_action': logs_by_action,
            'logs_by_user': logs_by_user,
            'logs_by_risk_level': logs_by_risk_level,
            'recent_high_risk_events': recent_high_risk,
            'failed_operations': failed_operations,
            'unique_users': unique_users,
            'unique_ips': unique_ips,
        }
        
        serializer = AuditSummarySerializer(summary_data)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def integrity_check(self, request):
        """Check integrity of audit logs."""
        # Get date range for check
        start_date = request.data.get('start_date')
        end_date = request.data.get('end_date')
        
        queryset = AuditLog.objects.all()
        if start_date:
            queryset = queryset.filter(timestamp__gte=start_date)
        if end_date:
            queryset = queryset.filter(timestamp__lte=end_date)
        
        # Limit to reasonable number for performance
        queryset = queryset[:1000]
        
        total_checked = 0
        valid_entries = 0
        invalid_log_ids = []
        
        for log_entry in queryset:
            total_checked += 1
            if log_entry.verify_integrity():
                valid_entries += 1
            else:
                invalid_log_ids.append(str(log_entry.id))
        
        invalid_entries = total_checked - valid_entries
        integrity_percentage = (valid_entries / total_checked * 100) if total_checked > 0 else 100
        
        result_data = {
            'total_checked': total_checked,
            'valid_entries': valid_entries,
            'invalid_entries': invalid_entries,
            'integrity_percentage': round(integrity_percentage, 2),
            'invalid_log_ids': invalid_log_ids,
        }
        
        serializer = IntegrityCheckSerializer(result_data)
        return Response(serializer.data)


class DataAccessLogViewSet(ReadOnlyModelViewSet):
    """
    ViewSet for data access log viewing (admin only).
    """
    serializer_class = DataAccessLogSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdministrator]
    
    def get_queryset(self):
        queryset = DataAccessLog.objects.select_related('user')
        
        # Apply filters
        user_id = self.request.query_params.get('user_id')
        if user_id:
            queryset = queryset.filter(user_id=user_id)
        
        access_type = self.request.query_params.get('access_type')
        if access_type:
            queryset = queryset.filter(access_type=access_type)
        
        resource_type = self.request.query_params.get('resource_type')
        if resource_type:
            queryset = queryset.filter(resource_type=resource_type)
        
        return queryset


class SecurityEventViewSet(ModelViewSet):
    """
    ViewSet for security event management (admin only).
    """
    permission_classes = [permissions.IsAuthenticated, IsAdministrator]
    
    def get_serializer_class(self):
        if self.action == 'list':
            return SecurityEventListSerializer
        elif self.action == 'investigate':
            return SecurityEventInvestigationSerializer
        return SecurityEventSerializer
    
    def get_queryset(self):
        queryset = SecurityEvent.objects.select_related('user', 'investigated_by')
        
        # Apply filters
        event_type = self.request.query_params.get('event_type')
        if event_type:
            queryset = queryset.filter(event_type=event_type)
        
        severity = self.request.query_params.get('severity')
        if severity:
            queryset = queryset.filter(severity=severity)
        
        investigated = self.request.query_params.get('investigated')
        if investigated is not None:
            queryset = queryset.filter(investigated=investigated.lower() == 'true')
        
        ip_address = self.request.query_params.get('ip_address')
        if ip_address:
            queryset = queryset.filter(ip_address=ip_address)
        
        return queryset
    
    @action(detail=True, methods=['patch'])
    def investigate(self, request, pk=None):
        """Mark security event as investigated."""
        event = self.get_object()
        serializer = self.get_serializer(event, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        
        return Response(SecurityEventSerializer(event, context={'request': request}).data)
    
    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Get security event summary statistics."""
        # Date range for summary (default: last 30 days)
        end_date = timezone.now()
        start_date = end_date - timedelta(days=30)
        
        queryset = SecurityEvent.objects.filter(timestamp__gte=start_date)
        
        # Basic counts
        total_events = queryset.count()
        failed_logins = queryset.filter(event_type='login_failure').count()
        uninvestigated_events = queryset.filter(investigated=False).count()
        
        # Events by type
        events_by_type = dict(
            queryset.values('event_type').annotate(count=Count('id')).values_list('event_type', 'count')
        )
        
        # Events by severity
        events_by_severity = dict(
            queryset.values('severity').annotate(count=Count('id')).values_list('severity', 'count')
        )
        
        # Recent critical events
        recent_critical = SecurityEventListSerializer(
            queryset.filter(severity='critical').order_by('-timestamp')[:10],
            many=True
        ).data
        
        # Suspicious IPs (IPs with multiple failed events)
        suspicious_ips = list(
            queryset.filter(severity__in=['error', 'critical'])
            .values('ip_address')
            .annotate(count=Count('id'))
            .filter(count__gte=3)
            .order_by('-count')[:10]
            .values_list('ip_address', flat=True)
        )
        
        summary_data = {
            'total_events': total_events,
            'events_by_type': events_by_type,
            'events_by_severity': events_by_severity,
            'recent_critical_events': recent_critical,
            'failed_logins': failed_logins,
            'suspicious_ips': suspicious_ips,
            'uninvestigated_events': uninvestigated_events,
        }
        
        serializer = SecuritySummarySerializer(summary_data)
        return Response(serializer.data)


class SystemHealthLogViewSet(ReadOnlyModelViewSet):
    """
    ViewSet for system health log viewing (admin only).
    """
    serializer_class = SystemHealthLogSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdministrator]
    
    def get_queryset(self):
        queryset = SystemHealthLog.objects.all()
        
        # Apply filters
        metric_type = self.request.query_params.get('metric_type')
        if metric_type:
            queryset = queryset.filter(metric_type=metric_type)
        
        is_healthy = self.request.query_params.get('is_healthy')
        if is_healthy is not None:
            queryset = queryset.filter(is_healthy=is_healthy.lower() == 'true')
        
        return queryset
    
    @action(detail=False, methods=['get'])
    def current_status(self, request):
        """Get current system health status."""
        # Get latest metrics for each type
        latest_metrics = {}
        
        for metric_type, _ in SystemHealthLog.METRIC_TYPES:
            latest = SystemHealthLog.objects.filter(
                metric_type=metric_type
            ).order_by('-timestamp').first()
            
            if latest:
                latest_metrics[metric_type] = SystemHealthLogSerializer(latest).data
        
        # Overall health status
        unhealthy_metrics = [
            metric for metric in latest_metrics.values()
            if not metric['is_healthy']
        ]
        
        overall_status = 'healthy' if not unhealthy_metrics else 'unhealthy'
        
        return Response({
            'overall_status': overall_status,
            'metrics': latest_metrics,
            'unhealthy_count': len(unhealthy_metrics),
            'last_updated': timezone.now()
        })


class AuditSearchView(generics.GenericAPIView):
    """
    Advanced search view for audit logs.
    """
    serializer_class = AuditSearchSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdministrator]
    
    def post(self, request):
        """Perform advanced audit log search."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Build query
        queryset = AuditLog.objects.select_related('user')
        
        # Apply search filters
        filters = serializer.validated_data
        
        if filters.get('user_id'):
            queryset = queryset.filter(user_id=filters['user_id'])
        
        if filters.get('action'):
            queryset = queryset.filter(action=filters['action'])
        
        if filters.get('resource_type'):
            queryset = queryset.filter(resource_type__icontains=filters['resource_type'])
        
        if filters.get('ip_address'):
            queryset = queryset.filter(ip_address=filters['ip_address'])
        
        if filters.get('start_date'):
            queryset = queryset.filter(timestamp__gte=filters['start_date'])
        
        if filters.get('end_date'):
            queryset = queryset.filter(timestamp__lte=filters['end_date'])
        
        if filters.get('risk_level'):
            queryset = queryset.filter(risk_level=filters['risk_level'])
        
        if filters.get('success') is not None:
            queryset = queryset.filter(success=filters['success'])
        
        if filters.get('search_term'):
            term = filters['search_term']
            queryset = queryset.filter(
                Q(description__icontains=term) |
                Q(resource_type__icontains=term) |
                Q(user__username__icontains=term) |
                Q(error_message__icontains=term)
            )
        
        # Limit results for performance
        queryset = queryset[:500]
        
        # Serialize results
        results = AuditLogListSerializer(queryset, many=True).data
        
        return Response({
            'results': results,
            'count': len(results),
            'search_criteria': serializer.validated_data
        })