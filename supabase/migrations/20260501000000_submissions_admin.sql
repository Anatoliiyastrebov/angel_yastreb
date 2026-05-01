-- Wellness questionnaire submissions (consultant dashboard + retention)
-- Run in Supabase SQL editor or via CLI migrations.

CREATE TABLE IF NOT EXISTS submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  answers JSONB NOT NULL DEFAULT '{}'::JSONB,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'processed')),
  processed_at TIMESTAMPTZ,
  questionnaire_type TEXT,
  language TEXT
);

CREATE INDEX IF NOT EXISTS idx_submissions_created_at ON submissions (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions (status);
CREATE INDEX IF NOT EXISTS idx_submissions_name_phone ON submissions (name, phone);

ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;

-- No SELECT/INSERT/UPDATE/DELETE policies: public users and authenticated users cannot access this table.
-- Application uses SUPABASE_SERVICE_ROLE_KEY on the server only.

CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actor_email TEXT NOT NULL,
  action TEXT NOT NULL,
  submission_id UUID REFERENCES submissions (id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_created_at ON admin_audit_logs (created_at DESC);

ALTER TABLE admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Optional: create a private Storage bucket "submission-files" in the Supabase Dashboard
-- and store only server-generated paths in answers.attachments.

COMMENT ON TABLE submissions IS 'Questionnaire payloads; Telegram must not store this data.';
COMMENT ON COLUMN submissions.answers IS 'JSONB: questionnaire fields, contacts, attachments metadata, etc.';
