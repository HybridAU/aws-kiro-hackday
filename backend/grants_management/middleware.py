"""
Custom middleware for security and access control.
"""
import logging
from django.http import HttpResponseForbidden
from django.utils.deprecation import MiddlewareMixin
from django.conf import settings

logger = logging.getLogger(__name__)


class SecurityHeadersMiddleware(MiddlewareMixin):
    """
    Middleware to add security headers to all responses.
    """
    
    def process_response(self, request, response):
        # Add security headers
        response['X-Content-Type-Options'] = 'nosniff'
        response['X-Frame-Options'] = 'DENY'
        response['X-XSS-Protection'] = '1; mode=block'
        response['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        
        # Add CSP header for API responses
        if request.path.startswith('/api/'):
            response['Content-Security-Policy'] = "default-src 'none'; frame-ancestors 'none';"
        
        # HSTS header (only in production with HTTPS)
        if not settings.DEBUG and request.is_secure():
            response['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains; preload'
        
        return response


class HTTPSRedirectMiddleware(MiddlewareMixin):
    """
    Middleware to enforce HTTPS in production.
    """
    
    def process_request(self, request):
        if not settings.DEBUG and not request.is_secure():
            # Allow health checks and internal requests
            if request.path in ['/health/', '/admin/']:
                return None
            
            # Redirect to HTTPS
            from django.http import HttpResponsePermanentRedirect
            return HttpResponsePermanentRedirect(
                f"https://{request.get_host()}{request.get_full_path()}"
            )
        return None


class RateLimitMiddleware(MiddlewareMixin):
    """
    Simple rate limiting middleware for authentication endpoints.
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
        self.rate_limit_cache = {}
        super().__init__(get_response)
    
    def process_request(self, request):
        # Only apply rate limiting to auth endpoints
        if not request.path.startswith('/api/auth/'):
            return None
        
        # Get client IP
        client_ip = self.get_client_ip(request)
        
        # Check rate limit for login attempts
        if request.path == '/api/auth/login/' and request.method == 'POST':
            return self.check_login_rate_limit(client_ip)
        
        return None
    
    def get_client_ip(self, request):
        """Get the client IP address."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip
    
    def check_login_rate_limit(self, client_ip):
        """Check rate limit for login attempts."""
        import time
        
        current_time = time.time()
        window_size = 300  # 5 minutes
        max_attempts = 5
        
        # Clean old entries
        self.rate_limit_cache = {
            ip: attempts for ip, attempts in self.rate_limit_cache.items()
            if any(timestamp > current_time - window_size for timestamp in attempts)
        }
        
        # Get attempts for this IP
        attempts = self.rate_limit_cache.get(client_ip, [])
        
        # Filter recent attempts
        recent_attempts = [
            timestamp for timestamp in attempts
            if timestamp > current_time - window_size
        ]
        
        if len(recent_attempts) >= max_attempts:
            logger.warning(f"Rate limit exceeded for IP: {client_ip}")
            return HttpResponseForbidden("Too many login attempts. Please try again later.")
        
        # Add current attempt
        recent_attempts.append(current_time)
        self.rate_limit_cache[client_ip] = recent_attempts
        
        return None


class APIVersionMiddleware(MiddlewareMixin):
    """
    Middleware to handle API versioning.
    """
    
    def process_request(self, request):
        # Set default API version
        if request.path.startswith('/api/'):
            request.api_version = request.META.get('HTTP_API_VERSION', 'v1')
        return None


class RequestLoggingMiddleware(MiddlewareMixin):
    """
    Middleware to log API requests for security monitoring.
    """
    
    def process_request(self, request):
        # Log API requests
        if request.path.startswith('/api/'):
            logger.info(
                f"API Request: {request.method} {request.path} "
                f"from {self.get_client_ip(request)} "
                f"User: {getattr(request.user, 'username', 'Anonymous')}"
            )
        return None
    
    def process_response(self, request, response):
        # Log API responses with status codes
        if request.path.startswith('/api/'):
            logger.info(
                f"API Response: {request.method} {request.path} "
                f"Status: {response.status_code} "
                f"User: {getattr(request.user, 'username', 'Anonymous')}"
            )
        return response
    
    def get_client_ip(self, request):
        """Get the client IP address."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip