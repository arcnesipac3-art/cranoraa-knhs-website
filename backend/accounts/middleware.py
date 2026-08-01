import time
from django.utils.deprecation import MiddlewareMixin
from django.utils.functional import SimpleLazyObject
from channels.middleware import BaseMiddleware
from channels.db import database_sync_to_async
from urllib.parse import parse_qs
from jwt import decode as jwt_decode
from django.conf import settings

# High-frequency endpoints that should not be logged to avoid table bloat
_SKIP_LOG_PATHS = (
    '/api/v1/token/',
    '/api/v1/token/refresh/',
    '/api/v1/system/maintenance-status/',
    '/api/v1/notifications/polling/',
    '/api/v1/chat/messages/',
)


class APIRequestLoggingMiddleware(MiddlewareMixin):
    """Middleware to log API requests for analytics"""

    def process_request(self, request):
        request.start_time = time.time()
        return None

    def process_response(self, request, response):
        if not request.path.startswith('/api/'):
            return response

        if request.path.startswith(_SKIP_LOG_PATHS):
            return response

        if hasattr(request, 'start_time'):
            response_time = (time.time() - request.start_time) * 1000
        else:
            response_time = 0

        ip_address = self.get_client_ip(request)
        user = request.user if request.user.is_authenticated else None

        if user:
            from django.utils import timezone
            try:
                from .models import User as UserModel
                UserModel.objects.filter(id=user.id).update(last_activity=timezone.now())
            except Exception:
                pass

        if not (request.method == 'GET' and 200 <= response.status_code < 300):
            try:
                from .models import APIRequestLog
                APIRequestLog.objects.create(
                    endpoint=request.path[:255],
                    method=request.method,
                    status_code=response.status_code,
                    response_time_ms=round(response_time, 2),
                    ip_address=ip_address,
                    user=user
                )
            except Exception:
                pass

        return response

    def get_client_ip(self, request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


class ContentSecurityPolicyMiddleware(MiddlewareMixin):
    """
    Injects a Content-Security-Policy header on every response.
    Policy values are read from Django settings (CSP_* keys).
    Falls back to a strict default if settings are not configured.
    """

    def process_response(self, request, response):
        from django.conf import settings

        # CSP headers belong on HTML documents, not API responses.
        # Sending them on /api/ endpoints adds unnecessary overhead and can
        # interfere with cross-origin fetch in some browsers.
        if request.path.startswith('/api/'):
            return response

        directives = {
            'default-src': getattr(settings, 'CSP_DEFAULT_SRC', ("'self'",)),
            'script-src':  getattr(settings, 'CSP_SCRIPT_SRC',  ("'self'",)),
            'style-src':   getattr(settings, 'CSP_STYLE_SRC',   ("'self'", "'unsafe-inline'")),
            'font-src':    getattr(settings, 'CSP_FONT_SRC',    ("'self'",)),
            'img-src':     getattr(settings, 'CSP_IMG_SRC',     ("'self'", "data:", "https:", "blob:")),
            'connect-src': getattr(settings, 'CSP_CONNECT_SRC', ("'self'",)),
            'worker-src':  getattr(settings, 'CSP_WORKER_SRC',  ("'self'", "blob:")),
            'frame-ancestors': getattr(settings, 'CSP_FRAME_ANCESTORS', ("'none'",)),
        }

        policy_parts = []
        for directive, sources in directives.items():
            policy_parts.append(f"{directive} {' '.join(sources)}")

        response['Content-Security-Policy'] = '; '.join(policy_parts)
        return response


class RequestSizeLimitMiddleware(MiddlewareMixin):
    """
    Rejects requests whose Content-Length exceeds MAX_UPLOAD_SIZE before
    the body is read into memory. This is a defence-in-depth layer on top
    of Django's DATA_UPLOAD_MAX_MEMORY_SIZE setting.

    Default limit: 10 MB (covers multipart file uploads for enrollment docs).
    Override with settings.MAX_REQUEST_BODY_SIZE (bytes).
    """

    def process_request(self, request):
        from django.conf import settings
        from django.http import JsonResponse

        max_size = getattr(settings, 'MAX_REQUEST_BODY_SIZE', 10 * 1024 * 1024)  # 10 MB
        content_length = request.META.get('CONTENT_LENGTH')

        if content_length:
            try:
                if int(content_length) > max_size:
                    return JsonResponse(
                        {'error': f'Request body too large. Maximum allowed size is {max_size // (1024*1024)} MB.'},
                        status=413
                    )
            except (ValueError, TypeError):
                pass

        return None


class JWTAuthMiddleware(BaseMiddleware):
    """
    ASGI middleware for JWT authentication on WebSocket connections.
    Extracts JWT token from query string or Authorization header.
    If neither is present, falls back to anonymous — the consumer
    should handle first-message auth (type: 'auth') for token-in-body flows.
    """

    async def __call__(self, scope, receive, send):
        from django.contrib.auth import get_user_model
        User = get_user_model()

        query_string = scope.get('query_string', b'').decode()
        params = parse_qs(query_string)
        token = params.get('token', [None])[0]

        if not token:
            headers = dict(scope.get('headers', []))
            auth_header = headers.get(b'authorization', b'').decode()
            if auth_header.startswith('Bearer '):
                token = auth_header[7:]

        if token:
            try:
                decoded = jwt_decode(
                    token,
                    settings.SECRET_KEY,
                    algorithms=['HS256']
                )
                user = await database_sync_to_async(User.objects.get)(id=decoded['user_id'])
                scope['user'] = user
            except Exception:
                scope['user'] = SimpleLazyObject(lambda: None)
        else:
            scope['user'] = SimpleLazyObject(lambda: None)

        return await super().__call__(scope, receive, send)
