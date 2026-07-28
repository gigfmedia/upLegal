-- Add observability columns to error_logs
-- These fields provide client context for debugging cross-browser/device issues

ALTER TABLE error_logs
ADD COLUMN IF NOT EXISTS build_version text,
ADD COLUMN IF NOT EXISTS commit_hash text,
ADD COLUMN IF NOT EXISTS browser text,
ADD COLUMN IF NOT EXISTS os text,
ADD COLUMN IF NOT EXISTS viewport text,
ADD COLUMN IF NOT EXISTS anonymous_id text;

-- Index for querying errors by build version (e.g. "all errors from deploy X")
CREATE INDEX IF NOT EXISTS idx_error_logs_build_version ON error_logs (build_version);

-- Index for querying errors by browser
CREATE INDEX IF NOT EXISTS idx_error_logs_browser ON error_logs (browser);

-- Index for querying errors by OS
CREATE INDEX IF NOT EXISTS idx_error_logs_os ON error_logs (os);