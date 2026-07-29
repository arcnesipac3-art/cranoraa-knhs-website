"""FCM push token management views."""
import os
import logging

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from ..models import FCMToken

logger = logging.getLogger(__name__)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def fcm_token_register(request):
    """
    POST /api/fcm-tokens/
    Save or refresh a user's FCM push token.
    Body: { "token": "<fcm_token>", "device_type": "web" }
    """
    token = request.data.get('token', '').strip()
    device_type = request.data.get('device_type', 'web')

    if not token:
        return Response({'error': 'token is required'}, status=status.HTTP_400_BAD_REQUEST)

    if device_type not in ('web', 'android', 'ios'):
        device_type = 'web'

    obj, created = FCMToken.objects.update_or_create(
        token=token,
        defaults={
            'user': request.user,
            'device_type': device_type,
            'is_active': True,
        }
    )

    return Response(
        {'status': 'registered', 'created': created},
        status=status.HTTP_201_CREATED if created else status.HTTP_200_OK
    )


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def fcm_token_delete(request):
    """
    DELETE /api/fcm-tokens/
    Deactivate the token on logout.
    Body: { "token": "<fcm_token>" }
    """
    token = request.data.get('token', '').strip()
    if not token:
        return Response({'error': 'token is required'}, status=status.HTTP_400_BAD_REQUEST)

    updated = FCMToken.objects.filter(
        user=request.user, token=token
    ).update(is_active=False)

    return Response({'status': 'deactivated', 'count': updated})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def test_push_notification(request):
    """
    POST /api/test-push/
    Sends a test push notification to the current user's active tokens.
    """
    from ..fcm import send_push_notification

    if os.environ.get('FCM_ENABLED', 'true').lower() == 'false':
        return Response({'error': 'Push notifications are disabled (FCM_ENABLED=false)'}, status=400)

    project_id = os.environ.get('FIREBASE_PROJECT_ID', '')
    sa_json = os.environ.get('FIREBASE_SERVICE_ACCOUNT_JSON', '')

    if not project_id:
        return Response({'error': 'Missing FIREBASE_PROJECT_ID in Render environment variables'}, status=400)
    if not sa_json:
        return Response({'error': 'Missing FIREBASE_SERVICE_ACCOUNT_JSON in Render environment variables'}, status=400)

    tokens = FCMToken.objects.filter(user=request.user, is_active=True)
    token_count = tokens.count()
    if token_count == 0:
        return Response({'error': 'No active push tokens found for your account. Try refreshing the page.'}, status=400)

    try:
        send_push_notification(
            user=request.user,
            title="Test Notification",
            body="If you see this, push notifications are working correctly!",
            data={"link": "/notifications"}
        )
        return Response({
            'status': 'success',
            'message': f'Test push dispatched to {token_count} active device(s).',
            'note': 'If you still dont see it, check your Windows "Do Not Disturb" settings or Chrome notification permissions.'
        })
    except Exception as e:
        logger.error(f"Firebase error: {str(e)}", exc_info=True)
        return Response({'error': 'Failed to process notification request.'}, status=500)
