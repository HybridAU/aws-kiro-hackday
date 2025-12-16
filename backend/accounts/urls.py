"""
URL configuration for accounts app.
"""
from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from . import views

urlpatterns = [
    # Registration
    path('register/organization/', views.OrganizationRegistrationView.as_view(), name='organization-register'),
    path('register/admin/', views.AdminRegistrationView.as_view(), name='admin-register'),
    
    # Authentication
    path('login/', views.LoginView.as_view(), name='login'),
    path('logout/', views.LogoutView.as_view(), name='logout'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token-refresh'),
    
    # Email verification
    path('verify-email/', views.EmailVerificationView.as_view(), name='email-verify'),
    
    # Password reset
    path('password-reset/request/', views.PasswordResetRequestView.as_view(), name='password-reset-request'),
    
    # User profile
    path('profile/', views.UserProfileView.as_view(), name='user-profile'),
    path('organization/', views.OrganizationProfileView.as_view(), name='organization-profile'),
    path('me/', views.user_info, name='user-info'),
]