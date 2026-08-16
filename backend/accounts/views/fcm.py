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
def fcm_deactivate_all(request):
    """
    POST /api/v1/fcm-tokens/deactivate-all/
    Deactivate ALL FCM tokens for the current user.
    Used on login to force a fresh token registration.
    """
    count = FCMToken.objects.filter(user=request.user, is_active=True).update(is_active=False)
    return Response({'status': 'deactivated', 'count': count})


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

    missing = []
    if not project_id:
        missing.append('FIREBASE_PROJECT_ID')
    if not sa_json:
        missing.append('FIREBASE_SERVICE_ACCOUNT_JSON')

    if missing:
        return Response({
            'error': f'Missing environment variables: {", ".join(missing)}',
            'setup_guide': (
                '1. Go to Firebase Console → Project Settings → Service Accounts\n'
                '2. Click "Generate new private key" to download the JSON file\n'
                '3. Set FIREBASE_PROJECT_ID to your Firebase project ID\n'
                '4. Set FIREBASE_SERVICE_ACCOUNT_JSON to the entire contents of the JSON file\n'
                '5. Redeploy your backend (or restart dev server)'
            )
        }, status=400)

    tokens = FCMToken.objects.filter(user=request.user, is_active=True)
    token_count = tokens.count()
    if token_count == 0:
        return Response({
            'error': 'No active push tokens found for your account.',
            'hint': 'Open the app in Chrome, allow notifications, then try again. Your browser must support push notifications.',
            'token_count': 0,
        }, status=400)

    try:
        results = send_push_notification(
            user=request.user,
            title="Test Notification",
            body="If you see this, push notifications are working correctly!",
            data={"link": "/notifications"}
        )
        if not results:
            return Response({
                'status': 'no_tokens',
                'message': 'No active FCM tokens found. Re-register by toggling notifications off/on.',
                'token_count': 0,
            }, status=200)
        
        succeeded = [r for r in results if r.get('ok')]
        failed = [r for r in results if not r.get('ok')]
        
        return Response({
            'status': 'success' if succeeded else 'failed',
            'message': f'{len(succeeded)} sent, {len(failed)} failed out of {len(results)} token(s)',
            'results': results,
        })
    except Exception as e:
        logger.error(f"Firebase error: {str(e)}", exc_info=True)
        return Response({'error': f'Failed to send: {str(e)}'}, status=500)
