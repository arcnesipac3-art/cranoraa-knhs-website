#!/usr/bin/env bash
set -o errexit

echo "Creating migrations for new models..."
python manage.py makemigrations accounts --no-input 2>&1 || echo "WARNING: makemigrations failed (maybe no new models)"

echo "Running migrations..."
python manage.py migrate --no-input 2>&1 || echo "WARNING: migrate failed"

echo "Seeding compliance types..."
python manage.py seed_compliance_types 2>&1 || echo "WARNING: seed failed"

echo "Starting server..."
exec daphne -b 0.0.0.0 -p $PORT school_portal.asgi:application
