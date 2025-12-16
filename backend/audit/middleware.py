"""
Middleware for automatic audit logging.
"""
import json
import time
from django.utils.deprecation import MiddlewareMixin
from django.contrib.contenttypes.models import ContentType
from .models import AuditLog, DataAccessLog, SecurityEvent


class AuditMiddleware(MiddlewareMixin):
    """
    Middleware to automatically log user actions and API requests.
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
        super().__init__(get_response)
    
    def process_request(self, request):
        # Store request start time for performance tracking
        request._audit_start_time = time.time()
        return None
    
    def process_response(self, request, response):
        # Only log API requests
        if not request.path.startswith('/api/'):
            return response
        
        # Skip certain endpoints to avoid noise
        skip_paths = [
            '/api/auth/token/refresh/',
            '/api/communications/notifications/unread_count/',
            '/api/audit/health/',
        ]
        
        if any(request.path.startswith(path) for path in skip_paths):
            return response
        
        # Log the request
        self.log_api_request(request, response)
        
        # Log security events for failed requests
        if response.status_code >= 400:
            self.log_security_event(request, response)
        
        return response
    
    def log_api_request(self, request, response):
        """Log API request details."""
        try:
            # Determine action type based on HTTP method
            action_map = {
                'GET': 'read',
                'POST': 'create',
                'PUT': 'update',
                'PATCH': 'update',
                'DELETE': 'delete',
            }
            
            action = action_map.get(request.method, 'read')
            
            # Extract resource type from URL
            resource_type = self.extract_resource_type(request.path)
            
            # Determine risk level
            risk_level = self.determine_risk_level(request, response)
            
            # Create audit log entry
            AuditLog.log_action(
                user=request.user if request.user.is_authenticated else None,
                action=action,
                resource_type=resource_type,
                request=request,
                description=f"{request.method} {request.path}",
                risk_level=risk_level,
                success=response.status_code < 400,
                error_message=self.get_error_message(response) if response.status_code >= 400 else ''
            )
            
            # Log data access for GET requests
            if request.method == 'GET' and response.status_code == 200:
                self.log_data_access(request, resource_type)
                
        except Exception as e:
            # Don't let audit logging break the application
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Audit logging failed: {str(e)}")
    
    def log_data_access(self, request, resource_type):
        """Log data access events."""
        try:
            # Determine access type
            access_type = 'list' if 'list' in request.path else 'view'
            
            # Extract query parameters
            query_params = dict(request.GET) if request.GET else None
            
            DataAccessLog.objects.create(
                user=request.user if request.user.is_authenticated else None,
                access_type=access_type,
                resource_type=resource_type,
                query_params=query_params,
                ip_address=AuditLog.get_client_ip(request),
                user_agent=request.META.get('HTTP_USER_AGENT', '')[:500]
            )
        except Exception:
            pass  # Fail silently for data access logging
    
    def log_security_event(self, request, response):
        """Log security-related events."""
        try:
            event_type = 'permission_denied'
            severity = 'warning'
            
            # Determine event type and severity based on status code
            if response.status_code == 401:
                event_type = 'unauthorized_access'
                severity = 'warning'
            elif response.status_code == 403:
                event_type = 'permission_denied'
                severity = 'warning'
            elif response.status_code == 429:
                event_type = 'login_blocked'
                severity = 'error'
            elif response.status_code >= 500:
                event_type = 'suspicious_activity'
                severity = 'error'
            
            # Check for potential attack patterns
            if self.is_potential_attack(request):
                event_type = 'suspicious_activity'
                severity = 'critical'
            
            SecurityEvent.objects.create(
                user=request.user if request.user.is_authenticated else None,
                event_type=event_type,
                severity=severity,
                description=f"HTTP {response.status_code} for {request.method} {request.path}",
                ip_address=AuditLog.get_client_ip(request),
                user_agent=request.META.get('HTTP_USER_AGENT', '')[:500],
                request_path=request.path[:500],
                response_status=response.status_code,
                additional_data={
                    'method': request.method,
                    'query_params': dict(request.GET) if request.GET else None,
                }
            )
        except Exception:
            pass  # Fail silently for security event logging
    
    def extract_resource_type(self, path):
        """Extract resource type from API path."""
        # Remove /api/ prefix and extract the first path segment
        path_parts = path.strip('/').split('/')
        if len(path_parts) > 1 and path_parts[0] == 'api':
            return path_parts[1] if len(path_parts) > 1 else 'unknown'
        return 'unknown'
    
    def determine_risk_level(self, request, response):
        """Determine risk level based on request and response."""
        # High risk operations
        if request.method in ['DELETE']:
            return 'high'
        
        # Medium risk operations
        if request.method in ['POST', 'PUT', 'PATCH']:
            return 'medium'
        
        # Failed authentication/authorization
        if response.status_code in [401, 403]:
            return 'medium'
        
        # Server errors
        if response.status_code >= 500:
            return 'high'
        
        # Check for sensitive endpoints
        sensitive_endpoints = [
            '/api/auth/',
            '/api/admin/',
            '/api/audit/',
        ]
        
        if any(request.path.startswith(endpoint) for endpoint in sensitive_endpoints):
            return 'medium'
        
        return 'low'
    
    def is_potential_attack(self, request):
        """Check if request shows signs of potential attack."""
        # Check for SQL injection patterns
        sql_patterns = ['union', 'select', 'drop', 'insert', 'delete', '--', ';']
        query_string = request.META.get('QUERY_STRING', '').lower()
        
        if any(pattern in query_string for pattern in sql_patterns):
            return True
        
        # Check for XSS patterns
        xss_patterns = ['<script', 'javascript:', 'onerror=', 'onload=']
        if any(pattern in query_string for pattern in xss_patterns):
            return True
        
        # Check for path traversal
        if '../' in request.path or '..\\' in request.path:
            return True
        
        # Check for excessive request size
        if hasattr(request, 'body') and len(request.body) > 10 * 1024 * 1024:  # 10MB
            return True
        
        return False
    
    def get_error_message(self, response):
        """Extract error message from response."""
        try:
            if hasattr(response, 'content'):
                content = response.content.decode('utf-8')
                if content:
                    # Try to parse JSON error message
                    try:
                        data = json.loads(content)
                        if isinstance(data, dict):
                            return data.get('detail', data.get('error', ''))[:500]
                    except json.JSONDecodeError:
                        pass
                    return content[:500]
        except Exception:
            pass
        return ''


class AuthenticationAuditMiddleware(MiddlewareMixin):
    """
    Middleware specifically for authentication event logging.
    """
    
    def process_response(self, request, response):
        # Log authentication events
        if request.path == '/api/auth/login/':
            self.log_login_attempt(request, response)
        elif request.path == '/api/auth/logout/':
            self.log_logout(request, response)
        
        return response
    
    def log_login_attempt(self, request, response):
        """Log login attempts."""
        try:
            if response.status_code == 200:
                # Successful login
                SecurityEvent.objects.create(
                    user=request.user if request.user.is_authenticated else None,
                    event_type='login_success',
                    severity='info',
                    description='User logged in successfully',
                    ip_address=AuditLog.get_client_ip(request),
                    user_agent=request.META.get('HTTP_USER_AGENT', '')[:500],
                    request_path=request.path,
                    response_status=response.status_code
                )
                
                # Also create audit log
                AuditLog.log_action(
                    user=request.user,
                    action='login',
                    resource_type='authentication',
                    request=request,
                    description='User login',
                    risk_level='medium',
                    success=True
                )
            else:
                # Failed login
                SecurityEvent.objects.create(
                    event_type='login_failure',
                    severity='warning',
                    description='Failed login attempt',
                    ip_address=AuditLog.get_client_ip(request),
                    user_agent=request.META.get('HTTP_USER_AGENT', '')[:500],
                    request_path=request.path,
                    response_status=response.status_code,
                    additional_data={
                        'email': request.data.get('email', '') if hasattr(request, 'data') else ''
                    }
                )
        except Exception:
            pass  # Fail silently
    
    def log_logout(self, request, response):
        """Log logout events."""
        try:
            SecurityEvent.objects.create(
                user=request.user if request.user.is_authenticated else None,
                event_type='logout',
                severity='info',
                description='User logged out',
                ip_address=AuditLog.get_client_ip(request),
                user_agent=request.META.get('HTTP_USER_AGENT', '')[:500],
                request_path=request.path,
                response_status=response.status_code
            )
            
            AuditLog.log_action(
                user=request.user if request.user.is_authenticated else None,
                action='logout',
                resource_type='authentication',
                request=request,
                description='User logout',
                risk_level='low',
                success=response.status_code == 200
            )
        except Exception:
            pass  # Fail silently