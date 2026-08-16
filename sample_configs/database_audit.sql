-- ==============================================================================
-- Ziraat Katılım Bankası — Veritabanı Güvenlik ve Denetim İzi Şeması
-- BDDK ve ISO 27001 Bilgi Güvenliği Standartları
-- ==============================================================================

CREATE TABLE IF NOT EXISTS zk_audit_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id VARCHAR(64) NOT NULL,
    operator_sicil VARCHAR(20) NOT NULL,
    target_host VARCHAR(64) NOT NULL,
    operation_type VARCHAR(32) NOT NULL,
    command_text TEXT,
    exit_status INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    integrity_sha256 VARCHAR(64) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_operator ON zk_audit_ledger(operator_sicil);
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON zk_audit_ledger(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_host ON zk_audit_ledger(target_host);

-- Yüksek riskli komut filtreleme görünümü
CREATE OR REPLACE VIEW v_zk_critical_security_events AS
SELECT 
    id,
    operator_sicil,
    target_host,
    command_text,
    created_at
FROM zk_audit_ledger
WHERE command_text ILIKE ANY (ARRAY['%rm -rf%', '%chmod 777%', '%drop table%', '%shutdown%', '%reboot%'])
ORDER BY created_at DESC;
