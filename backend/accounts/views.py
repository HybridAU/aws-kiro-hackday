"""
Views for user authentication and organization management.
"""
import uuid
from django.contrib.auth import login
from django.core.mail import send_mail
from django.conf import settings
from django.utils import timezone
from rest_framework import status, generics, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from .models import User, Organization
from .serializers import (
    UserRegistrationSerializer,
    OrganizationRegistrationSerializer,
    UserLoginSerializer,
    UserSerializer,
    OrganizationSerializer,
    EmailVerificationSerializer,
    PasswordResetRequestSerializer,
    PasswordResetSerializer
)


class OrganizationRegistrationView(generics.CreateAPIView):
    """
    API endpoint for organization registration.
    """
    serializer_class = OrganizationRegistrationSerializer
    permission_classes = [permissions.AllowAny]
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        organization = serializer.save()
        
        # Send email verification
        self.send_verification_email(organization.user)
        
        return Response({
            'message': 'Organization registered successfully. Please check your email for verification.',
            'organization_id': organization.id
        }, status=status.HTTP_201_CREATED)
    
    def send_verification_email(self, user):
        """Send email verification to the user."""
        verification_url = f"{settings.FRONTEND_URL}/verify-email/{user.email_verification_token}"
        
        send_mail(
            subject='Verify your email address',
            message=f'Please click the following link to verify your email: {verification_url}',
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=False,
        )


class AdminRegistrationView(generics.CreateAPIView):
    """
    API endpoint for administrator registration (restricted).
    """
    serializer_class = UserRegistrationSerializer
    permission_classes = [permissions.IsAdminUser]
    
    def create(self, request, *args, **kwargs):
        data = request.data.copy()
        data['role'] = 'administrator'  # Force administrator role
        
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        return Response({
            'message': 'Administrator registered successfully.',
            'user_id': user.id
        }, status=status.HTTP_201_CREATED)


class LoginView(APIView):
    """
    API endpoint for user authentication.
    """
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        serializer = UserLoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        user = serializer.validated_data['user']
        user.last_login = timezone.now()
        user.save(update_fields=['last_login'])
        
        # Generate JWT tokens
        refresh = RefreshToken.for_user(user)
        access_token = refresh.access_token
        
        # Add custom claims
        access_token['role'] = user.role
        access_token['email_verified'] = user.email_verified
        
        response_data = {
            'access': str(access_token),
            'refresh': str(refresh),
            'user': UserSerializer(user).data
        }
        
        # Include organization data if user is an organization
        if user.is_organization and hasattr(user, 'organization'):
            response_data['organization'] = OrganizationSerializer(user.organization).data
        
        return Response(response_data, status=status.HTTP_200_OK)


class LogoutView(APIView):
    """
    API endpoint for user logout.
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        try:
            refresh_token = request.data.get('refresh')
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()
            
            return Response({'message': 'Logged out successfully.'}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': 'Invalid token.'}, status=status.HTTP_400_BAD_REQUEST)


class EmailVerificationView(APIView):
    """
    API endpoint for email verification.
    """
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        serializer = EmailVerificationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        token = serializer.validated_data['token']
        user = User.objects.get(email_verification_token=token, email_verified=False)
        
        user.email_verified = True
        user.email_verification_token = uuid.uuid4()  # Reset token
        user.save(update_fields=['email_verified', 'email_verification_token'])
        
        return Response({'message': 'Email verified successfully.'}, status=status.HTTP_200_OK)


class PasswordResetRequestView(APIView):
    """
    API endpoint for password reset request.
    """
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        email = serializer.validated_data['email']
        user = User.objects.get(email=email)
        
        # Generate password reset token
        reset_token = uuid.uuid4()
        user.password_reset_token = reset_token
        user.password_reset_expires = timezone.now() + timezone.timedelta(hours=1)
        user.save(update_fields=['password_reset_token', 'password_reset_expires'])
        
        # Send password reset email
        reset_url = f"{settings.FRONTEND_URL}/reset-password/{reset_token}"
        send_mail(
            subject='Password Reset Request',
            message=f'Please click the following link to reset your password: {reset_url}',
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=False,
        )
        
        return Response({'message': 'Password reset email sent.'}, status=status.HTTP_200_OK)


class UserProfileView(generics.RetrieveUpdateAPIView):
    """
    API endpoint for user profile management.
    """
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_object(self):
        return self.request.user


class OrganizationProfileView(generics.RetrieveUpdateAPIView):
    """
    API endpoint for organization profile management.
    """
    serializer_class = OrganizationSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_object(self):
        if not self.request.user.is_organization:
            raise permissions.PermissionDenied("Only organization users can access this endpoint.")
        return self.request.user.organization


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def user_info(request):
    """
    API endpoint to get current user information.
    """
    user_data = UserSerializer(request.user).data
    
    response_data = {
        'user': user_data,
        'permissions': {
            'is_organization': request.user.is_organization,
            'is_administrator': request.user.is_administrator,
        }
    }
    
    # Include organization data if applicable
    if request.user.is_organization and hasattr(request.user, 'organization'):
        response_data['organization'] = OrganizationSerializer(request.user.organization).data
    
    return Response(response_data)