-- FASE 4B-5 C7 + durable pending expiration
-- Fix exclusion constraint to only block reserving statuses, and add expires_at

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS expires_at timestamptz;

-- Backfill expires_at for existing pending rows (15m TTL)
UPDATE bookings SET expires_at = created_at + interval '15 minutes' WHERE status = 'pending' AND expires_at IS NULL;

-- Ensure trigger sets expires_at on new pending bookings
CREATE OR REPLACE FUNCTION set_booking_range()
RETURNS trigger AS $$
BEGIN
  IF NEW.scheduled_date IS NOT NULL AND NEW.scheduled_time IS NOT NULL THEN
    NEW.booking_range = tsrange(
      (NEW.scheduled_date + NEW.scheduled_time::time)::timestamp,
      (NEW.scheduled_date + NEW.scheduled_time::time + (NEW.duration || ' minutes')::interval)::timestamp,
      '[)'
    );
  END IF;
  IF NEW.status = 'pending' AND NEW.expires_at IS NULL THEN
    NEW.expires_at = now() + interval '15 minutes';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_booking_range ON bookings;
CREATE TRIGGER trg_set_booking_range
  BEFORE INSERT OR UPDATE OF scheduled_date, scheduled_time, duration, status, expires_at
  ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION set_booking_range();

-- Fix exclusion constraint: only pending and confirmed reserve the slot
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS no_overlapping_bookings;
ALTER TABLE bookings ADD CONSTRAINT no_overlapping_bookings
  EXCLUDE USING gist (
    lawyer_id WITH =,
    booking_range WITH &&
  ) WHERE (status IN ('pending', 'confirmed'));

-- Function to expire stale pending bookings durably
CREATE OR REPLACE FUNCTION expire_stale_pending_bookings()
RETURNS integer LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE affected integer;
BEGIN
  UPDATE public.bookings
  SET status = 'expired', updated_at = now()
  WHERE status = 'pending'
    AND expires_at IS NOT NULL
    AND expires_at < now()
    AND payment_id IS NULL;
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$;

-- One-time cleanup of already stale pending (durably, not just cancelled)
SELECT expire_stale_pending_bookings();
