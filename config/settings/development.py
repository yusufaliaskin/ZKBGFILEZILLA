"""
Development settings for ZK Remote Operations Center.
"""

from .base import *

SECRET_KEY = os.getenv('SECRET_KEY', 'django-insecure-zk-remote-ops-center-dev-key-change-in-prod-!#99x')

DEBUG = True

ALLOWED_HOSTS = ['*']

CSRF_TRUSTED_ORIGINS = [
    'http://127.0.0.1:8000',
    'http://localhost:8000',
    'http://127.0.0.1:3030',
    'http://localhost:3030',
    'http://10.211.77.83:3030',
    'http://10.211.77.83:8000',
    'http://10.211.77.83',
]

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}

CORS_ALLOW_ALL_ORIGINS = True

# In development, add browsable API renderer for easy debugging
REST_FRAMEWORK['DEFAULT_RENDERER_CLASSES'] = [
    'rest_framework.renderers.JSONRenderer',
    'rest_framework.renderers.BrowsableAPIRenderer',
]

