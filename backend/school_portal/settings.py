"""
Django settings for school_portal project.
"""

from pathlib import Path
import os
import dj_database_url
from datetime import timedelta
from corsheaders.defaults import default_headers

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent


# SECURITY WARNING: keep the secret key used in production secret!
# Must be set via environment variable — no insecure fallback.
_secret_key = os.environ.get('DJANGO_SECRET_KEY')
if not _secret_key:
    if os.environ.get('DEBUG', 'False').lower() in ('true', '1', 't'):
        # Allow a dev-only fallback so local dev still boots without .env
        _secret_key = 'django-insecure-local-dev-only-do-not-use-in-production'
    else:
        raise RuntimeError(
            "DJANGO_SECRET_KEY environment variable is not set. "
            "Generate one with: python -c \"import secrets; print(secrets.token_hex(50))\""
        )
SECRET_KEY = _secret_key

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = os.environ.get('DEBUG', 'False').lower() in ('true', '1', 't')

# Allowed hosts for the Django application. In production, this should be your Render URL.
ALLOWED_HOSTS = os.environ.get('ALLOWED_HOSTS', 'localhost,127.0.0.1').split(',')

RENDER_EXTERNAL_HOSTNAME = os.environ.get('RENDER_EXTERNAL_HOSTNAME')
if RENDER_EXTERNAL_HOSTNAME:
    ALLOWED_HOSTS.append(RENDER_EXTERNAL_HOSTNAME)


# Application definition

INSTALLED_APPS = [
    'daphne',
    'whitenoise.runserver_nostatic',
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',
    'corsheaders',
    'axes',
    'channels',
    'accounts',
    'portal',
    'school_forms',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'axes.middleware.AxesMiddleware',
    'accounts.middleware.RequestSizeLimitMiddleware',
    'accounts.middleware.APIRequestLoggingMiddleware',
    'accounts.middleware.ContentSecurityPolicyMiddleware',
]

ROOT_URLCONF = 'school_portal.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'school_portal.wsgi.application'
ASGI_APPLICATION = 'school_portal.asgi.application'

# Channels Layer for WebSockets
# Use Redis if REDIS_URL is provided in environment variables.
# Fallback to InMemoryChannelLayer if Redis is unavailable to prevent boot errors.
if os.environ.get('REDIS_URL'):
    CHANNEL_LAYERS = {
        'default': {
            'BACKEND': 'channels_redis.core.RedisChannelLayer',
            'CONFIG': {
                "hosts": [{
                    "address": os.environ.get('REDIS_URL'),
                    "socket_connect_timeout": 10,
                    "socket_timeout": 10,
                    "socket_keepalive": True,
                    "retry_on_timeout": True,
                }],
                # OPTIMIZATION: limit channel capacity to prevent unbounded Redis memory growth.
                # Messages beyond capacity are dropped (old ones) rather than accumulating.
                "capacity": 100,          # max messages per channel (default: 100)
                "expiry": 30,             # seconds before undelivered messages expire (default: 60)
                # group_expiry: how long a group membership lives in Redis.
                # Shorter = fewer stale keys. 3600s = 1 hour (default: 86400).
                "group_expiry": 3600,
            },
        },
    }
else:
    CHANNEL_LAYERS = {
        'default': {
            'BACKEND': 'channels.layers.InMemoryChannelLayer',
        },
    }

# Database
DATABASE_URL = os.environ.get('DATABASE_URL')
if DATABASE_URL:
    DATABASES = {
        'default': dj_database_url.config(
            default=DATABASE_URL,
            conn_max_age=600,
            conn_health_checks=True,
            ssl_require=not DEBUG,
        )
    }
    DATABASES['default'].setdefault('OPTIONS', {})
    DATABASES['default']['OPTIONS'].setdefault('options', '-c search_path=public')
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }

# Cache Configuration
# Uses Redis when REDIS_URL is set and reachable.
# Falls back to local in-memory cache if Redis is unavailable.
_redis_url = os.environ.get('REDIS_URL')
if not _redis_url:
    # Auto-detect local Redis for development
    try:
        import socket as _sock
        _s = _sock.socket(_sock.AF_INET, _sock.SOCK_STREAM)
        _s.settimeout(0.3)
        _s.connect(('localhost', 6379))
        _s.close()
        _redis_url = 'redis://localhost:6379/0'
    except Exception:
        _redis_url = None

if _redis_url:
    CACHES = {
        'default': {
            'BACKEND': 'django_redis.cache.RedisCache',
            'LOCATION': _redis_url,
            'OPTIONS': {
                'CLIENT_CLASS': 'django_redis.client.DefaultClient',
            },
            'KEY_PREFIX': 'knhs',
            'TIMEOUT': 60,
        }
    }
else:
    CACHES = {
        'default': {
            'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        }
    }


# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
        'OPTIONS': {
            'min_length': 8,
        }
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
    {
        'NAME': 'accounts.validators.StrongPasswordValidator',
    },
]


# Internationalization
LANGUAGE_CODE = 'en-us'

TIME_ZONE = 'Asia/Manila'

USE_I18N = True

USE_TZ = True


# Static files (CSS, JavaScript, Images)
STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')
STORAGES = {
    "default": {
        "BACKEND": "django.core.files.storage.FileSystemStorage",
    },
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
    },
}

# Default primary key field type
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Custom User Model
AUTH_USER_MODEL = 'accounts.User'

# Authentication Backends (including Axes for rate limiting)
AUTHENTICATION_BACKENDS = [
    'axes.backends.AxesStandaloneBackend',
    'accounts.backends.SchoolAuthBackend',
    'django.contrib.auth.backends.ModelBackend',
]

# REST Framework Configuration
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
    # Global rate limiting — auth-specific throttles are applied per-view
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '60/minute',          # general anonymous limit
        'user': '300/minute',         # general authenticated limit
        'auth': '20/minute',            # login / password-reset (per IP + username)
        'check_result': '10/hour',    # scratch-card grade lookup
        'enrollment': '20/hour',      # public enrollment form submissions
        'csv_import': '5/hour',       # CSV import per user
        'admin_write': '30/minute',   # admin create user, toggle maintenance, etc.
        'public_read': '60/minute',   # public endpoints (announcements, login)
        'dashboard': '20/minute',     # heavy dashboard/stats endpoints
        'logout': '10/minute',        # logout (prevent token blacklist abuse)
    },
}

# JWT Configuration
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=15),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,
    'AUTH_HEADER_TYPES': ('Bearer',),
    'AUTH_TOKEN_CLASSES': ('rest_framework_simplejwt.tokens.AccessToken',),
    'TOKEN_TYPE_CLAIM': 'token_type',
}

# CORS Configuration
# All origins must be configured via environment variables.
_frontend_url = os.environ.get('FRONTEND_URL', 'http://localhost:5173')
_cors_env = os.environ.get('CORS_ALLOWED_ORIGINS', '')

CORS_ALLOWED_ORIGINS = []

# Only allow localhost in DEBUG mode
if DEBUG:
    CORS_ALLOWED_ORIGINS.extend([
        'http://localhost:5173',
        'http://127.0.0.1:5173',
    ])

# Add frontend URL from env
if _frontend_url and _frontend_url not in CORS_ALLOWED_ORIGINS:
    CORS_ALLOWED_ORIGINS.append(_frontend_url)

# Add additional origins from CORS_ALLOWED_ORIGINS env var
if _cors_env:
    for o in _cors_env.split(','):
        if o.strip() and o.strip() not in CORS_ALLOWED_ORIGINS:
            CORS_ALLOWED_ORIGINS.append(o.strip())

CORS_ALLOW_ALL_ORIGINS = False  # Never allow all origins — explicit list only
CORS_ALLOW_CREDENTIALS = True

CORS_ALLOW_HEADERS = list(default_headers) + [
    'authorization',
]

# CSRF Configuration
CSRF_TRUSTED_ORIGINS = []

# Only allow localhost in DEBUG mode
if DEBUG:
    CSRF_TRUSTED_ORIGINS.extend([
        'http://localhost:5173',
        'http://127.0.0.1:5173',
    ])

# Sync with CORS origins
for origin in CORS_ALLOWED_ORIGINS:
    if origin not in CSRF_TRUSTED_ORIGINS:
        CSRF_TRUSTED_ORIGINS.append(origin)

_csrf_env = os.environ.get('CSRF_TRUSTED_ORIGINS', '')
if _csrf_env:
    for o in _csrf_env.split(','):
        if o.strip() and o.strip() not in CSRF_TRUSTED_ORIGINS:
            CSRF_TRUSTED_ORIGINS.append(o.strip())

# Email sending has been removed from this portal.
# All email-related settings below are kept as empty stubs to avoid
# import errors in any code that still references them.
MAILJET_API_KEY = None
MAILJET_SECRET_KEY = None
MAILJET_SENDER_EMAIL = ''
DEFAULT_FROM_EMAIL = 'noreply@knhsportal.dedyn.io'

# Media Files Configuration
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# Django Axes Configuration (Rate Limiting & Account Lockout)
# 5 failures per 15-minute window before lockout (matches auth throttle)
AXES_FAILURE_LIMIT = int(os.environ.get('AXES_FAILURE_LIMIT', 5))
AXES_COOLOFF_TIME = timedelta(minutes=int(os.environ.get('AXES_COOLOFF_TIME', 15)))
AXES_RESET_ON_SUCCESS = True
AXES_LOCKOUT_PARAMETERS = ['username', 'ip_address']

# Security Headers
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
SECURE_SSL_REDIRECT = not DEBUG
SECURE_HSTS_SECONDS = 31536000 if not DEBUG else 0
SECURE_HSTS_INCLUDE_SUBDOMAINS = not DEBUG
SECURE_HSTS_PRELOAD = not DEBUG
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_BROWSER_XSS_FILTER = True
X_FRAME_OPTIONS = 'DENY'

# Session Security
SESSION_COOKIE_SECURE = not DEBUG
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = 'Lax'
CSRF_COOKIE_SECURE = not DEBUG
CSRF_COOKIE_HTTPONLY = False  # SPA needs to read CSRF cookie for double-submit pattern
CSRF_COOKIE_SAMESITE = 'Lax'

# Frontend URL for verification links
FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://localhost:5173')

# ─── Supabase Configuration ───────────────────────────────────────────────────
SUPABASE_URL = os.environ.get('SUPABASE_URL')
SUPABASE_KEY = os.environ.get('SUPABASE_SERVICE_ROLE_KEY') or os.environ.get('SUPABASE_KEY')

# Legacy single-bucket setting (kept for backward compat)
SUPABASE_BUCKET = os.environ.get('SUPABASE_STORAGE_BUCKET', 'profile-pictures')

# Per-bucket overrides — defaults match the bucket names in accounts/storage.py
# Set these in Render env vars only if you rename a bucket.
SUPABASE_BUCKET_PROFILES     = os.environ.get('SUPABASE_BUCKET_PROFILES',     'profile-pictures')
SUPABASE_BUCKET_ANNOUNCEMENTS= os.environ.get('SUPABASE_BUCKET_ANNOUNCEMENTS','announcements')
SUPABASE_BUCKET_ASSIGNMENTS  = os.environ.get('SUPABASE_BUCKET_ASSIGNMENTS',  'assignments')
SUPABASE_BUCKET_SUBMISSIONS  = os.environ.get('SUPABASE_BUCKET_SUBMISSIONS',  'submissions')
SUPABASE_BUCKET_MATERIALS    = os.environ.get('SUPABASE_BUCKET_MATERIALS',    'learning-materials')
SUPABASE_BUCKET_REPORTS      = os.environ.get('SUPABASE_BUCKET_REPORTS',      'reports')
SUPABASE_BUCKET_ENROLLMENT   = os.environ.get('SUPABASE_BUCKET_ENROLLMENT',   'enrollment-docs')
SUPABASE_BUCKET_BRANDING     = os.environ.get('SUPABASE_BUCKET_BRANDING',     'branding')

if not SUPABASE_URL or not SUPABASE_KEY:
    import logging as _logging
    _logging.getLogger(__name__).warning("SUPABASE_URL or SUPABASE_KEY not set — file uploads will fail.")

# Email sending has been removed from this portal.
RESEND_API_KEY = None
RESEND_FROM_EMAIL = ''

# ─── Content Security Policy ─────────────────────────────────────────────────
# Restricts which resources the browser may load, mitigating XSS.
# Adjust script/style/connect sources to match your actual CDN/API domains.
SECURE_REFERRER_POLICY = 'strict-origin-when-cross-origin'

# Custom CSP header injected via SecurityMiddleware extension (see accounts/middleware.py)
CSP_DEFAULT_SRC = ("'self'",)
CSP_SCRIPT_SRC = ("'self'", "https://www.gstatic.com", "https://www.googleapis.com")
CSP_STYLE_SRC = ("'self'", "https://fonts.googleapis.com") if not DEBUG else ("'self'", "'unsafe-inline'", "https://fonts.googleapis.com")
CSP_FONT_SRC = ("'self'", "https://fonts.gstatic.com")
CSP_IMG_SRC = ("'self'", "data:", "https://*.supabase.co", "https://*.supabase.in", "https://firebasestorage.googleapis.com", "blob:")
_csp_connect_extra = [_frontend_url] if _frontend_url else []
_csp_connect_localhost = ["http://localhost:5173", "http://127.0.0.1:5173"] if DEBUG else []
CSP_CONNECT_SRC = tuple(
    ["'self'",
     "https://fcm.googleapis.com",
     "https://firebaseinstallations.googleapis.com",
     "https://*.supabase.co"] + _csp_connect_localhost + _csp_connect_extra
)
CSP_WORKER_SRC = ("'self'", "blob:")
CSP_FRAME_ANCESTORS = ("'none'",)

# ─── Request size limits ──────────────────────────────────────────────────────
# Reject oversized payloads before they reach view logic.
DATA_UPLOAD_MAX_MEMORY_SIZE = 5 * 1024 * 1024   # 5 MB for JSON/form data
FILE_UPLOAD_MAX_MEMORY_SIZE = 5 * 1024 * 1024   # 5 MB in-memory file threshold
DATA_UPLOAD_MAX_NUMBER_FIELDS = 200              # Prevent hash-flood DoS via many fields

# ─── API Documentation (OpenAPI / Swagger) ────────────────────────────────────
SPECTACULAR_SETTINGS = {
    'TITLE': 'KNHS PRISM Portal API',
    'DESCRIPTION': 'School management system API for Kiwalan National High School. Manages students, teachers, classrooms, grades, attendance, scheduling, and announcements.',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
}

# ─── Structured Logging ──────────────────────────────────────────────────────
try:
    import pythonjsonlogger  # noqa: F401
    _json_formatter = {"()": "pythonjsonlogger.jsonlogger.JsonFormatter", "format": "%(asctime)s %(levelname)s %(name)s %(message)s"}
    _console_formatter = "json" if not DEBUG else "verbose"
except ImportError:
    _json_formatter = None
    _console_formatter = "verbose"

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        **({"json": _json_formatter} if _json_formatter else {}),
        "verbose": {
            "format": "{asctime} [{levelname}] {name}: {message}",
            "style": "{",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": _console_formatter,
        },
    },
    "loggers": {
        "django": {
            "handlers": ["console"],
            "level": "WARNING" if not DEBUG else "INFO",
            "propagate": True,
        },
        "accounts": {
            "handlers": ["console"],
            "level": "INFO",
            "propagate": False,
        },
    },
    "root": {
        "handlers": ["console"],
        "level": "WARNING",
    },
}

# ─── Sentry Error Tracking ───────────────────────────────────────────────────
_sentry_dsn = os.environ.get("SENTRY_DSN")
if _sentry_dsn:
    import sentry_sdk
    from sentry_sdk.integrations.logging import LoggingIntegration

    sentry_logging = LoggingIntegration(
        level="WARNING",
        event_level="ERROR",
    )
    sentry_sdk.init(
        dsn=_sentry_dsn,
        integrations=[sentry_logging],
        traces_sample_rate=0.1 if not DEBUG else 0,
        send_default_pii=False,
    )
