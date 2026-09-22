-- Unknown estimates are NULL; keep the legacy default for writers omitting it.
-- Metadata-only ALTER TABLE; ACCESS EXCLUSIVE lock is bounded by lock_timeout.
SET lock_timeout = '5s';
ALTER TABLE public.ai_usage ALTER COLUMN estimated_cost_usd DROP NOT NULL;
RESET lock_timeout;
