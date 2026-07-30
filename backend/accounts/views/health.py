from django.http import JsonResponse
from django.db import connection


def health_check_view(request):
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
    except Exception as e:
        return JsonResponse(
            {"status": "unhealthy", "database": str(e)},
            status=503,
        )
    return JsonResponse(
        {"status": "healthy", "database": "ok", "version": "1.0.0"},
        status=200,
    )
