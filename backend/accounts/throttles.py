"""
Custom DRF throttle classes for fine-grained rate limiting.

Rates are configured in settings.REST_FRAMEWORK['DEFAULT_THROTTLE_RATES'].
"""
from rest_framework.throttling import AnonRateThrottle, UserRateThrottle


def _login_identifier(request):
    """Extract login id from POST body for per-account throttle keys."""
    try:
        data = request.data
        ident = data.get('email') or data.get('username') or ''
        return str(ident).lower().strip()[:128]
    except Exception:
        return ''


class AuthRateThrottle(AnonRateThrottle):
    """
    Login / password-reset throttle keyed by IP + username/email.

    Using IP alone blocks entire schools on a shared NAT after a few attempts.
    Per-identifier keys allow many users on one network while still limiting
    brute-force against a single account.
    """
    scope = 'auth'

    def get_cache_key(self, request, view):
        ident = _login_identifier(request)
        if ident:
            return self.cache_format % {
                'scope': self.scope,
                'ident': f'{self.get_ident(request)}:{ident}',
            }
        return self.cache_format % {
            'scope': self.scope,
            'ident': self.get_ident(request),
        }


class CheckResultRateThrottle(AnonRateThrottle):
    """
    10 scratch-card grade lookups per hour per IP.
    Prevents brute-forcing registration numbers + card serials.
    """
    scope = 'check_result'


class EnrollmentRateThrottle(AnonRateThrottle):
    """
    20 enrollment form submissions per hour per IP.
    Prevents spam submissions of the public enrollment form.
    """
    scope = 'enrollment'


class CsvImportRateThrottle(UserRateThrottle):
    """
    Limit CSV imports to prevent abuse.
    5 imports per hour per user.

    Validation-only dry runs (`dry_run=1`) are exempt: the import wizard
    re-validates on every preview/fix cycle, and a dry run writes nothing.
    """
    scope = 'csv_import'

    def allow_request(self, request, view):
        try:
            if str(request.data.get('dry_run', '')).lower() in ('1', 'true', 'yes'):
                return True
        except Exception:
            # Unreadable body — fall through and throttle normally.
            pass
        return super().allow_request(request, view)


class AdminWriteRateThrottle(UserRateThrottle):
    """
    30 writes/min for admin actions (create user, toggle maintenance, etc.).
    """
    scope = 'admin_write'


class PublicReadRateThrottle(AnonRateThrottle):
    """
    60 reads/min for public endpoints (announcements, login page).
    """
    scope = 'public_read'


class DashboardRateThrottle(UserRateThrottle):
    """
    20 reads/min for heavy dashboard/stats endpoints.
    """
    scope = 'dashboard'


class LogoutRateThrottle(UserRateThrottle):
    """
    10/min per user for logout. Prevents token blacklist abuse.
    """
    scope = 'logout'


class TrackRateThrottle(AnonRateThrottle):
    """
    Rate limit for the enrollment tracking endpoint.
    30 requests per minute per IP to prevent enumeration attacks.
    """
    scope = 'track'
