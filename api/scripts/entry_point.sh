#!/bin/bash
set -e

# If arguments are passed to entry_point.sh, execute them (e.g. celery worker)
if [ $# -gt 0 ]; then
    echo "Executing custom command: $@"
    exec "$@"
fi

echo "Applying database migrations..."
python manage.py migrate --noinput


echo "Collecting static files..."
python manage.py collectstatic --noinput

echo "Starting Gunicorn server..."
exec gunicorn ayo_api.wsgi:application \
    --bind 0.0.0.0:8000 \
    --workers 3 \
    --timeout 120 \
    --access-logfile - \
    --error-logfile -
