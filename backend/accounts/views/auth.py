"""Authentication views: login, logout, password management, token refresh."""
from rest_framework import status, parsers
from rest_framework.decorators import api_view, permission_classes, throttle_classes, parser_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from django.utils import timezone
from django.db.models import Q
import logging

from ..serializers import UserSerializer
from ..permissions import IsAdmin
from ..throttles import AuthRateThrottle, LogoutRateThrottle
from ..utils import log_audit_action
from ._helpers import _set_refresh_cookie, _clear_refresh_cookie

logger = logging.getLogger(__name__)


@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([AuthRateThrottle])
def login_view(request):
    try:
        login_id = request.data.get('email') or request.data.get('username')
        password = request.data.get('password')
        required_role = request.data.get('role')

GENERIC_ERROR = 'Invalid credentials'

if login_id is None or password is None:
    return Response(
        {'error': 'Please provide both ID (Email/Student ID) and password'},
        status=status.HTTP_400_BAD_REQUEST
    )

user = authenticate(request=request, username=login_id, password=password)

if user is None:
    logger.warning(f"Login failed for identifier='{login_id}' — authenticate() returned None")
    return Response(
        {'error': GENERIC_ERROR},
        status=status.HTTP_401_UNAUTHORIZED
    )

        logger.info(f"Login success for user='{user.username}' role='{user.role}' status='{user.account_status}' approved={user.is_approved} active={user.is_active}")

        if required_role and user.role != 'admin':
            if user.role != required_role:
                return Response(
                    {'error': f'This account is registered as a {user.get_role_display()}. Please use the correct portal.', 'code': 'wrong_portal'},
                    status=status.HTTP_403_FORBIDDEN
                )

        if not user.is_active or user.account_status in ('inactive', 'suspended'):
            status_code = 'inactive' if not user.is_active or user.account_status == 'inactive' else 'suspended'
            return Response(
                {'error': 'Your account has been deactivated or suspended. Please contact the administrator.', 'code': status_code},
                status=status.HTTP_403_FORBIDDEN
            )

        if not user.is_approved:
            return Response(
                {'error': 'Your account is pending admin approval. Please wait for an administrator to approve your account.', 'code': 'not_approved'},
                status=status.HTTP_403_FORBIDDEN
            )

        if user.must_change_password:
            refresh = RefreshToken.for_user(user)
            response = Response({
                'must_change_password': True,
                'access': str(refresh.access_token),
                'user': UserSerializer(user).data
            }, status=status.HTTP_200_OK)
            _set_refresh_cookie(response, str(refresh))
            return response

        refresh = RefreshToken.for_user(user)

        try:
            log_audit_action(
                user=user,
                action='login',
                model_name='User',
                object_id=user.id,
                object_repr=str(user),
                description=f'User {user.username} logged in successfully',
                request=request
            )
        except Exception as audit_err:
            logger.error(f"Audit log failed on login: {audit_err}")

        response = Response({
            'access': str(refresh.access_token),
            'user': UserSerializer(user).data
        })
        _set_refresh_cookie(response, str(refresh))
        return response
    except Exception as e:
        logger.error(f"Login error: {str(e)}", exc_info=True)
        return Response(
            {'error': 'An unexpected error occurred. Please try again.'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def force_password_change_view(request):
    user = request.user
    new_password = request.data.get('password')

    if not new_password:
        return Response({'error': 'Password is required'}, status=status.HTTP_400_BAD_REQUEST)

    from django.contrib.auth.password_validation import validate_password
    from django.core.exceptions import ValidationError as DjangoValidationError
    try:
        validate_password(new_password, user=user)
    except DjangoValidationError as e:
        return Response({'error': ' '.join(e.messages)}, status=status.HTTP_400_BAD_REQUEST)

    user.set_password(new_password)
    user.must_change_password = False
    user.save()

    try:
        log_audit_action(
            user=request.user,
            action='password_change',
            model_name='User',
            object_id=user.id,
            object_repr=str(user),
            description=f'User {user.username} changed password (forced)',
            request=request
        )
    except Exception:
        pass

    refresh = RefreshToken.for_user(user)

    response = Response({
        'message': 'Password changed successfully!',
        'access': str(refresh.access_token),
    })
    _set_refresh_cookie(response, str(refresh))
    return response


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password_view(request):
    user = request.user
    current_password = request.data.get('current_password')
    new_password = request.data.get('new_password')

    if not current_password:
        return Response({'error': 'Current password is required'}, status=status.HTTP_400_BAD_REQUEST)

    if not new_password:
        return Response({'error': 'New password is required'}, status=status.HTTP_400_BAD_REQUEST)

    if not user.check_password(current_password):
        return Response({'error': 'Current password is incorrect'}, status=status.HTTP_400_BAD_REQUEST)

    from django.contrib.auth.password_validation import validate_password
    from django.core.exceptions import ValidationError as DjangoValidationError
    try:
        validate_password(new_password, user=user)
    except DjangoValidationError as e:
        return Response({'error': ' '.join(e.messages)}, status=status.HTTP_400_BAD_REQUEST)

    user.set_password(new_password)
    user.save()

    try:
        log_audit_action(
            user=request.user,
            action='password_change',
            model_name='User',
            object_id=user.id,
            object_repr=str(user),
            description=f'User {user.username} changed password',
            request=request
        )
    except Exception:
        pass

    refresh = RefreshToken.for_user(user)

    response = Response({
        'message': 'Password changed successfully!',
        'access': str(refresh.access_token),
    })
    _set_refresh_cookie(response, str(refresh))
    return response


@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([LogoutRateThrottle])
def logout_view(request):
    refresh_token = request.COOKIES.get('refresh_token') or request.data.get('refresh')
    if refresh_token:
        try:
            token = RefreshToken(refresh_token)
            token.blacklist()
        except Exception:
            pass

    try:
        if request.user.is_authenticated:
            log_audit_action(
                user=request.user,
                action='logout',
                model_name='User',
                object_id=request.user.id,
                object_repr=str(request.user),
                description=f'User {request.user.username} logged out',
                request=request
            )
    except Exception:
        pass

    response = Response({'message': 'Logged out successfully.'})
    _clear_refresh_cookie(response)
    return response


@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def notification_preferences_view(request):
    from ..serializers import NotificationPreferenceSerializer
    from ..models import NotificationPreference

    prefs, _ = NotificationPreference.objects.get_or_create(user=request.user)

    if request.method == 'GET':
        serializer = NotificationPreferenceSerializer(prefs)
        return Response(serializer.data)

    serializer = NotificationPreferenceSerializer(prefs, data=request.data, partial=True)
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([AuthRateThrottle])
def cookie_token_refresh_view(request):
    from rest_framework_simplejwt.exceptions import TokenError, InvalidToken
    from ..models import User

    refresh_token = request.COOKIES.get('refresh_token') or request.data.get('refresh')

    if not refresh_token:
        return Response(
            {'error': 'Refresh token not found. Please log in again.'},
            status=status.HTTP_401_UNAUTHORIZED
        )

    try:
        token = RefreshToken(refresh_token)
        access = str(token.access_token)

        if hasattr(token, 'blacklist'):
            token.blacklist()
        new_refresh = RefreshToken.for_user(
            User.objects.get(id=token['user_id'])
        )

        response = Response({'access': access})
        _set_refresh_cookie(response, str(new_refresh))
        return response

    except TokenError as e:
        return Response({'error': 'Invalid or expired refresh token.'}, status=status.HTTP_401_UNAUTHORIZED)
    except Exception:
        logger.error("Token refresh error", exc_info=True)
        return Response({'error': 'Token refresh failed.'}, status=status.HTTP_401_UNAUTHORIZED)



