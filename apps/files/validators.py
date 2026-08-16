"""
File and path security validators.
Protects against path traversal, forbidden system files, and oversized uploads.
"""

from django.conf import settings
from apps.connectors.exceptions import PathTraversalException, FileSizeLimitExceededException


def validate_safe_path(path: str) -> str:
    """
    Validates that a path does not contain traversal tokens (../ or ..\\) or null-byte poisoning.
    """
    if not path:
        return ''
    
    if '\x00' in path or '%00' in path:
        raise PathTraversalException('Geçersiz dosya yolu: Null-byte enjeksiyonu tespit edildi.')

    # Check traversal tokens
    normalized = path.replace('\\', '/')
    parts = normalized.split('/')
    if '..' in parts or '~' in parts or '...' in parts:
        raise PathTraversalException('Geçersiz dosya yolu: Dizin tırmanışı (path traversal) engellendi.')

    return path


def validate_file_size(file_obj) -> None:
    """
    Validates that uploaded file does not exceed maximum configured size.
    """
    max_size = getattr(settings, 'FILE_UPLOAD_MAX_SIZE', 104857600)  # 100 MB
    if file_obj.size > max_size:
        raise FileSizeLimitExceededException(
            f"Dosya boyutu çok büyük ({round(file_obj.size / (1024*1024), 1)} MB). "
            f"Maksimum izin verilen boyut: {round(max_size / (1024*1024), 1)} MB."
        )
