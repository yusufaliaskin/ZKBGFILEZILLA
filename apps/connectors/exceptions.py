"""
Standardized exceptions for the Connector Layer.
Enables unified error handling across Windows and Linux devices.
"""


class ConnectorException(Exception):
    """Base exception for all connector errors."""
    code = 'CONNECTOR_ERROR'
    default_message = 'Uzak cihaz bağlantısında bir hata oluştu.'

    def __init__(self, message=None, code=None, details=None):
        self.message = message or self.default_message
        self.code = code or self.code
        self.details = details or {}
        super().__init__(self.message)


class ConnectionFailedException(ConnectorException):
    code = 'CONNECTION_FAILED'
    default_message = 'Cihaza bağlantı kurulamadı. Cihaz kapalı olabilir veya ağ erişimi yok.'


class ConnectionTimeoutException(ConnectorException):
    code = 'CONNECTION_TIMEOUT'
    default_message = 'Cihaz bağlantısı zaman aşımına uğradı.'


class AuthenticationFailedException(ConnectorException):
    code = 'AUTHENTICATION_FAILED'
    default_message = 'Kimlik doğrulama başarısız. Kullanıcı adı veya parola/anahtar hatalı.'


class PermissionDeniedException(ConnectorException):
    code = 'PERMISSION_DENIED'
    default_message = 'Bu işlem için hedef cihazda yetkiniz bulunmuyor.'


class FileNotFoundException(ConnectorException):
    code = 'FILE_NOT_FOUND'
    default_message = 'Belirtilen dosya veya dizin bulunamadı.'


class FileAlreadyExistsException(ConnectorException):
    code = 'FILE_ALREADY_EXISTS'
    default_message = 'Bu isimde bir dosya veya dizin zaten mevcut.'


class PathTraversalException(ConnectorException):
    code = 'PATH_TRAVERSAL_DETECTED'
    default_message = 'Geçersiz dosya yolu formatı veya yetkisiz dizin erişimi engellendi.'


class OperationNotSupportedException(ConnectorException):
    code = 'OPERATION_NOT_SUPPORTED'
    default_message = 'Bu işlem ilgili işletim sistemi veya bağlantı türü tarafından desteklenmiyor.'


class FileSizeLimitExceededException(ConnectorException):
    code = 'FILE_SIZE_LIMIT_EXCEEDED'
    default_message = 'Dosya boyutu belirlenen sistem limitlerini aşıyor.'
