#!/usr/bin/env bash
# ==============================================================================
# Ziraat Katılım Bankası — Automated SFTP & System Backup Automation Service
# ==============================================================================

set -euo pipefail

BACKUP_SOURCE="/var/log/audit"
BACKUP_DEST="/backups/daily/$(date +%Y%m%d)"
LOG_FILE="/var/log/zk_backup.log"
RETENTION_DAYS=30

echo "[$(date '+%Y-%m-%d %H:%M:%S')] [INFO] Otomatik yedekleme süreci başlatıldı..." | tee -a "$LOG_FILE"

mkdir -p "$BACKUP_DEST"

# Compress and archive
ARCHIVE_NAME="audit_logs_$(date +%Y%m%d_%H%M%S).tar.gz"
tar -czf "$BACKUP_DEST/$ARCHIVE_NAME" "$BACKUP_SOURCE" 2>> "$LOG_FILE"

# SHA256 Integrity Seal
sha256sum "$BACKUP_DEST/$ARCHIVE_NAME" > "$BACKUP_DEST/$ARCHIVE_NAME.sha256"

# Cleanup old backups
find /backups/daily/ -type d -mtime +$RETENTION_DAYS -exec rm -rf {} + 2>/dev/null || true

echo "[$(date '+%Y-%m-%d %H:%M:%S')] [SUCCESS] Yedekleme tamamlandı: $ARCHIVE_NAME" | tee -a "$LOG_FILE"
exit 0
