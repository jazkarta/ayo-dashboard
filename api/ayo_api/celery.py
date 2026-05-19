import os
from celery import Celery

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ayo_api.settings')

app = Celery('ayo_api')
app.config_from_object('django.conf:settings', namespace='CELERY')

# Auto-discover tasks in all INSTALLED_APPS
app.autodiscover_tasks()
