"""
FCM HTTP v1 push notification utility.

Uses google-auth to obtain a short-lived OAuth2 access token from a
Firebase service account, then calls the FCM HTTP v1 REST API.

Required environment variables:
    FIREBASE_PROJECT_ID          — your Firebase project ID
    FIREBASE_SERVICE_ACCOUNT_JSON — the full JSON string of the service account key
                                    (paste the entire contents of the downloaded JSON file)

Optional:
    FCM_ENABLED=true             — set to 'false' to disable push without removing code
"""

import json
import logging
import os

import requests
from google.oauth2 import service_account
from google.auth.transport.requests import Request as GoogleAuthRequest

logger = logging.getLogger(__name__)

FCM_SCOPES = ['https://www.googleapis.com/auth/firebase.messaging']
_cached_credentials = None  # module-level cache; refreshed automatically by google-auth


def _get_access_token() -> str:
    """Return a valid OAuth2 bearer token for FCM, refreshing when expired."""
    global _cached_credentials

    sa_json = os.environ.get('FIREBASE_SERVICE_ACCOUNT_JSON', '')
    if not sa_json:
        raise EnvironmentError(
            'FIREBASE_SERVICE_ACCOUNT_JSON is not set. '
            'Paste the full service account JSON as an env var.'
        )

    if _cached_credentials is None or not _cached_credentials.valid:
        try:
            sa_info = json.loads(sa_json)
        except json.JSONDecodeError as exc:
            raise ValueError(f'FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON: {exc}') from exc

        _cached_credentials = service_account.Credentials.from_service_account_info(
            sa_info, scopes=FCM_SCOPES
        )

    if not _cached_credentials.valid:
        _cached_credentials.refresh(GoogleAuthRequest())

    return _cached_credentials.token


def _send_to_token(access_token: str, project_id: str, fcm_token: str,
                   title: str, body: str, data: dict,
                   device_type: str = 'web') -> dict:
    """Send a single FCM message. Returns the parsed JSON response."""
    url = f'https://fcm.googleapis.com/v1/projects/{project_id}/messages:send'

    # All data values must be strings for FCM
    str_data = {k: str(v) for k, v in (data or {}).items()}

    # Build the message payload.
    # For WEB tokens: use webpush + data only (NO top-level notification key).
    # Including the "notification" key tells FCM to handle delivery itself,
    # which bypasses the service-worker onBackgroundMessage handler — so
    # background push notifications silently fail on web.
    # For non-web tokens (android/ios): use the notification key so the
    # platform SDK can display natively.
    if device_type == 'web':
        payload = {
            'message': {
                'token': fcm_token,
                'webpush': {
                    'notification': {
                        'title': title,
                        'body': body,
                        'icon': '/icons/school-logo-source.png',
                        'badge': '/icons/school-logo-source.png',
                        'requireInteraction': False,
                    },
                    'fcm_options': {
                        'link': str_data.get('link', '/'),
                    },
                },
                'data': str_data,
            }
        }
    else:
        payload = {
            'message': {
                'token': fcm_token,
                'notification': {
                    'title': title,
                    'body': body,
                },
                'data': str_data,
            }
        }

    resp = requests.post(
        url,
        headers={
            'Authorization': f'Bearer {access_token}',
            'Content-Type': 'application/json',
        },
        json=payload,
        timeout=10,
    )
    return resp.status_code, resp.json()


def send_push_notification(user, title: str, body: str, data: dict = None) -> list:
    """
    Send a push notification to all active FCM tokens for `user`.

    Returns a list of dicts with per-token results:
      [{'token': '…xxxx', 'status': 200, 'ok': True}, ...]

    Silently skips if:
    - FCM_ENABLED env var is 'false'
    - FIREBASE_PROJECT_ID or FIREBASE_SERVICE_ACCOUNT_JSON are not set
    - The user has no active tokens

    Marks tokens inactive if FCM reports them as unregistered.
    """
    results = []

    if os.environ.get('FCM_ENABLED', 'true').lower() == 'false':
        return results

    project_id = os.environ.get('FIREBASE_PROJECT_ID', '')
    if not project_id:
        logger.warning('FCM: FIREBASE_PROJECT_ID not set — push notifications disabled.')
        return results

    sa_json = os.environ.get('FIREBASE_SERVICE_ACCOUNT_JSON', '')
    if not sa_json:
        logger.warning('FCM: FIREBASE_SERVICE_ACCOUNT_JSON not set — push notifications disabled.')
        return results

    # Import here to avoid circular imports at module load time
    from .models import FCMToken

    tokens = FCMToken.objects.filter(user=user, is_active=True)
    if not tokens.exists():
        return results

    try:
        access_token = _get_access_token()
    except Exception as exc:
        logger.error(f'FCM: failed to obtain access token: {exc}')
        return results

    for token_obj in tokens:
        try:
            status_code, response = _send_to_token(
                access_token, project_id, token_obj.token,
                title, body, data or {},
                device_type=token_obj.device_type,
            )

            if status_code == 200:
                logger.info(f'FCM: push sent to user {user.id} token …{token_obj.token[-8:]}')
                results.append({'token': f'…{token_obj.token[-8:]}', 'status': status_code, 'ok': True})

            elif status_code in (400, 404):
                # Token is invalid / unregistered — deactivate it
                error_code = (
                    (response.get('error', {}).get('details') or [{}])[0].get('errorCode', '')
                    or response.get('error', {}).get('status', '')
                )
                if error_code in ('UNREGISTERED', 'INVALID_ARGUMENT', 'NOT_FOUND'):
                    logger.warning(
                        f'FCM: deactivating stale token for user {user.id} '
                        f'(reason: {error_code})'
                    )
                    token_obj.is_active = False
                    token_obj.save(update_fields=['is_active'])
                results.append({
                    'token': f'…{token_obj.token[-8:]}',
                    'status': status_code,
                    'ok': False,
                    'error': error_code or response.get('error', {}).get('message', 'unknown'),
                })
            else:
                logger.warning(f'FCM: unexpected response for user {user.id}: {status_code} {response}')
                results.append({
                    'token': f'…{token_obj.token[-8:]}',
                    'status': status_code,
                    'ok': False,
                    'error': str(response),
                })

        except requests.Timeout:
            logger.warning(f'FCM: request timed out for user {user.id}')
            results.append({'token': f'…{token_obj.token[-8:]}', 'status': 0, 'ok': False, 'error': 'timeout'})
        except Exception as exc:
            logger.error(f'FCM: error sending to user {user.id}: {exc}')
            results.append({'token': f'…{token_obj.token[-8:]}', 'status': 0, 'ok': False, 'error': str(exc)})

    return results
