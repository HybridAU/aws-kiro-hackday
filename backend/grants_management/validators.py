"""
Custom validators for input validation and sanitization.
"""
import re
from django.core.exceptions import ValidationError
from django.core.validators import RegexValidator
from django.utils.html import strip_tags
from django.utils.text import slugify


class NoScriptValidator:
    """
    Validator to prevent script injection in text fields.
    """
    
    def __call__(self, value):
        if '<script' in value.lower() or 'javascript:' in value.lower():
            raise ValidationError(
                'Script content is not allowed.',
                code='script_content'
            )


class SafeHTMLValidator:
    """
    Validator to ensure HTML content is safe.
    """
    
    def __init__(self, allowed_tags=None):
        self.allowed_tags = allowed_tags or ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li']
    
    def __call__(self, value):
        # Strip all HTML tags except allowed ones
        import bleach
        cleaned = bleach.clean(
            value, 
            tags=self.allowed_tags,
            strip=True
        )
        
        if cleaned != value:
            raise ValidationError(
                'HTML content contains disallowed tags.',
                code='unsafe_html'
            )


class FileExtensionValidator:
    """
    Validator for file extensions.
    """
    
    def __init__(self, allowed_extensions):
        self.allowed_extensions = [ext.lower() for ext in allowed_extensions]
    
    def __call__(self, value):
        if hasattr(value, 'name'):
            extension = value.name.split('.')[-1].lower()
            if extension not in self.allowed_extensions:
                raise ValidationError(
                    f'File extension "{extension}" is not allowed. '
                    f'Allowed extensions: {", ".join(self.allowed_extensions)}',
                    code='invalid_extension'
                )


class FileSizeValidator:
    """
    Validator for file size limits.
    """
    
    def __init__(self, max_size_mb):
        self.max_size_bytes = max_size_mb * 1024 * 1024
    
    def __call__(self, value):
        if hasattr(value, 'size') and value.size > self.max_size_bytes:
            raise ValidationError(
                f'File size exceeds maximum allowed size of '
                f'{self.max_size_bytes // (1024 * 1024)}MB.',
                code='file_too_large'
            )


class AlphanumericValidator:
    """
    Validator to ensure string contains only alphanumeric characters and spaces.
    """
    
    def __init__(self, allow_spaces=True, allow_hyphens=False):
        self.allow_spaces = allow_spaces
        self.allow_hyphens = allow_hyphens
    
    def __call__(self, value):
        pattern = r'^[a-zA-Z0-9'
        if self.allow_spaces:
            pattern += r'\s'
        if self.allow_hyphens:
            pattern += r'\-'
        pattern += r']+$'
        
        if not re.match(pattern, value):
            allowed_chars = 'letters and numbers'
            if self.allow_spaces:
                allowed_chars += ' and spaces'
            if self.allow_hyphens:
                allowed_chars += ' and hyphens'
            
            raise ValidationError(
                f'This field can only contain {allowed_chars}.',
                code='invalid_characters'
            )


class NoSQLInjectionValidator:
    """
    Validator to prevent SQL injection patterns.
    """
    
    SQL_INJECTION_PATTERNS = [
        r'(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)',
        r'(--|#|/\*|\*/)',
        r'(\bOR\b.*=.*\bOR\b)',
        r'(\bAND\b.*=.*\bAND\b)',
        r'(\'.*\'.*=.*\'.*\')',
    ]
    
    def __call__(self, value):
        value_upper = value.upper()
        for pattern in self.SQL_INJECTION_PATTERNS:
            if re.search(pattern, value_upper, re.IGNORECASE):
                raise ValidationError(
                    'Input contains potentially dangerous content.',
                    code='sql_injection'
                )


class StrongPasswordValidator:
    """
    Validator for strong passwords.
    """
    
    def __init__(self, min_length=8):
        self.min_length = min_length
    
    def __call__(self, value):
        if len(value) < self.min_length:
            raise ValidationError(
                f'Password must be at least {self.min_length} characters long.',
                code='password_too_short'
            )
        
        if not re.search(r'[A-Z]', value):
            raise ValidationError(
                'Password must contain at least one uppercase letter.',
                code='password_no_upper'
            )
        
        if not re.search(r'[a-z]', value):
            raise ValidationError(
                'Password must contain at least one lowercase letter.',
                code='password_no_lower'
            )
        
        if not re.search(r'\d', value):
            raise ValidationError(
                'Password must contain at least one digit.',
                code='password_no_digit'
            )
        
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', value):
            raise ValidationError(
                'Password must contain at least one special character.',
                code='password_no_special'
            )


class BusinessEmailValidator:
    """
    Validator to check for business email addresses.
    """
    
    PERSONAL_EMAIL_DOMAINS = [
        'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com',
        'aol.com', 'icloud.com', 'mail.com', 'protonmail.com'
    ]
    
    def __call__(self, value):
        domain = value.split('@')[-1].lower()
        if domain in self.PERSONAL_EMAIL_DOMAINS:
            raise ValidationError(
                'Please use a business email address.',
                code='personal_email'
            )


class OrganizationNameValidator:
    """
    Validator for organization names.
    """
    
    def __call__(self, value):
        # Check minimum length
        if len(value.strip()) < 2:
            raise ValidationError(
                'Organization name must be at least 2 characters long.',
                code='name_too_short'
            )
        
        # Check for valid characters
        if not re.match(r'^[a-zA-Z0-9\s\-\.\,\&\']+$', value):
            raise ValidationError(
                'Organization name contains invalid characters.',
                code='invalid_characters'
            )
        
        # Check for suspicious patterns
        suspicious_patterns = [
            r'\b(test|demo|sample|example)\b',
            r'^[0-9]+$',  # Only numbers
            r'^[^a-zA-Z]*$',  # No letters
        ]
        
        for pattern in suspicious_patterns:
            if re.search(pattern, value, re.IGNORECASE):
                raise ValidationError(
                    'Please enter a valid organization name.',
                    code='suspicious_name'
                )


# Common validator instances
phone_validator = RegexValidator(
    regex=r'^\+?1?\d{9,15}$',
    message="Phone number must be entered in the format: '+999999999'. Up to 15 digits allowed."
)

document_file_validator = FileExtensionValidator([
    'pdf', 'doc', 'docx', 'xls', 'xlsx', 'txt', 'jpg', 'jpeg', 'png'
])

document_size_validator = FileSizeValidator(10)  # 10MB limit

no_script_validator = NoScriptValidator()
no_sql_injection_validator = NoSQLInjectionValidator()
organization_name_validator = OrganizationNameValidator()
business_email_validator = BusinessEmailValidator()