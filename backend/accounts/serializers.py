"""
Serializers for user authentication and organization management.
"""
from rest_framework import serializers
from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from .models import User, Organization


class UserRegistrationSerializer(serializers.ModelSerializer):
    """
    Serializer for user registration with password validation.
    """
    password = serializers.CharField(write_only=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True)
    
    class Meta:
        model = User
        fields = ['email', 'username', 'password', 'password_confirm', 'role']
        
    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError("Passwords don't match.")
        return attrs
    
    def create(self, validated_data):
        validated_data.pop('password_confirm')
        password = validated_data.pop('password')
        user = User.objects.create_user(**validated_data)
        user.set_password(password)
        user.save()
        return user


class OrganizationRegistrationSerializer(serializers.ModelSerializer):
    """
    Serializer for organization registration including user creation.
    """
    user = UserRegistrationSerializer()
    
    class Meta:
        model = Organization
        fields = ['user', 'name', 'contact_person', 'phone', 'address', 'registration_number']
        
    def create(self, validated_data):
        user_data = validated_data.pop('user')
        user_data['role'] = 'organization'  # Ensure organization role
        
        user_serializer = UserRegistrationSerializer(data=user_data)
        user_serializer.is_valid(raise_exception=True)
        user = user_serializer.save()
        
        organization = Organization.objects.create(user=user, **validated_data)
        return organization


class UserLoginSerializer(serializers.Serializer):
    """
    Serializer for user authentication.
    """
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
    
    def validate(self, attrs):
        email = attrs.get('email')
        password = attrs.get('password')
        
        if email and password:
            user = authenticate(username=email, password=password)
            if not user:
                raise serializers.ValidationError('Invalid email or password.')
            if not user.is_active:
                raise serializers.ValidationError('User account is disabled.')
            if not user.email_verified:
                raise serializers.ValidationError('Email address is not verified.')
            
            attrs['user'] = user
            return attrs
        else:
            raise serializers.ValidationError('Must include email and password.')


class UserSerializer(serializers.ModelSerializer):
    """
    Serializer for user profile information.
    """
    class Meta:
        model = User
        fields = ['id', 'email', 'username', 'role', 'email_verified', 'created_at', 'last_login']
        read_only_fields = ['id', 'email_verified', 'created_at', 'last_login']


class OrganizationSerializer(serializers.ModelSerializer):
    """
    Serializer for organization information.
    """
    user = UserSerializer(read_only=True)
    
    class Meta:
        model = Organization
        fields = ['id', 'user', 'name', 'contact_person', 'phone', 'address', 'registration_number', 'created_at']
        read_only_fields = ['id', 'user', 'created_at']


class EmailVerificationSerializer(serializers.Serializer):
    """
    Serializer for email verification.
    """
    token = serializers.UUIDField()
    
    def validate_token(self, value):
        try:
            user = User.objects.get(email_verification_token=value, email_verified=False)
            return value
        except User.DoesNotExist:
            raise serializers.ValidationError('Invalid or expired verification token.')


class PasswordResetRequestSerializer(serializers.Serializer):
    """
    Serializer for password reset request.
    """
    email = serializers.EmailField()
    
    def validate_email(self, value):
        try:
            User.objects.get(email=value)
            return value
        except User.DoesNotExist:
            raise serializers.ValidationError('No user found with this email address.')


class PasswordResetSerializer(serializers.Serializer):
    """
    Serializer for password reset confirmation.
    """
    token = serializers.UUIDField()
    password = serializers.CharField(write_only=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True)
    
    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError("Passwords don't match.")
        return attrs