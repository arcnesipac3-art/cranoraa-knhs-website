"""Temporary debug endpoint to reset admin password and create new admins.

SECURITY: Protected by fallback key. Remove this file after use.
"""
import os
import logging
from django.http import JsonResponse
from django.views.decorators.http import require_GET

logger = logging.getLogger(__name__)


@require_GET
def reset_admin_view(request):
    key = request.GET.get('key', '')
    expected = 'cranoraa-reset-2024'

    if not expected or key != expected:
        return JsonResponse({'error': 'Invalid or missing key'}, status=403)

    from accounts.models import User

    # --- Create new admin ---
    create_email = request.GET.get('create')
    if create_email:
        if User.objects.filter(email=create_email).exists():
            return JsonResponse({'error': f'{create_email} already exists'}, status=400)

        username = create_email.split('@')[0]
        base = username
        counter = 1
        while User.objects.filter(username=username).exists():
            username = f'{base}{counter}'
            counter += 1

        temp_password = 'Admin@2024'
        user = User.objects.create_user(
            email=create_email,
            username=username,
            password=temp_password,
            role='admin',
            is_active=True,
            is_approved=True,
            account_status='active',
            must_change_password=True,
        )
        logger.warning(f"ADMIN CREATE: created admin {user.email} (username={user.username})")
        return JsonResponse({
            'message': f'Admin created',
            'email': create_email,
            'username': username,
            'temp_password': temp_password,
            'note': 'User must change password on first login.',
        })

    # --- Reset existing admin ---
    email = request.GET.get('email', 'admin@school.com')
    new_password = request.GET.get('password', 'admin@school2024')

    try:
        user = User.objects.get(email=email)
    except User.DoesNotExist:
        return JsonResponse({'error': f'{email} not found'}, status=404)

    user.set_password(new_password)
    user.account_status = 'active'
    user.is_active = True
    user.is_approved = True
    user.must_change_password = False
    user.save()

    cleared = 0
    try:
        from axes.models import AccessAttempt
        deleted, _ = AccessAttempt.objects.filter(
            username__iexact=user.username
        ).delete()
        cleared += deleted
        deleted2, _ = AccessAttempt.objects.filter(
            username__iexact=user.email
        ).delete()
        cleared += deleted2
    except Exception:
        pass

    try:
        from axes.models import AccessLog
        AccessLog.objects.filter(username__iexact=user.username).delete()
    except Exception:
        pass

    logger.warning(f"ADMIN RESET: password changed for {user.email}, {cleared} Axes records cleared")

    return JsonResponse({
        'message': f'Password reset for {user.email}',
        'password': new_password,
        'axes_cleared': cleared,
    })
