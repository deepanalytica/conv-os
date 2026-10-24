-- Apply after OAuth + account ownership verified through official Meta APIs.
-- NEVER create VERIFIED rows based only on a webhook or user-entered ID.
CREATE TABLE IF NOT EXISTS meta_accounts (
  platform TEXT NOT NULL CHECK(platform IN ('instagram','messenger','whatsapp')),
  account_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','VERIFIED','REVOKED')),
  ownership_verified_at TEXT,
  PRIMARY KEY(platform,account_id),
  CHECK(status <> 'VERIFIED' OR ownership_verified_at IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS ix_meta_accounts_tenant ON meta_accounts(tenant_id,status);
