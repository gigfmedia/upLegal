-- Prevent double-booking: exclusion constraint for overlapping time slots
-- Requires btree_gist extension for combining equality (=) with range overlap (&&)

CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Add booking_range column for the exclusion constraint
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS booking_range tsrange;

-- Backfill existing rows
UPDATE bookings
SET booking_range = tsrange(
  (scheduled_date + scheduled_time::time)::timestamp,
  (scheduled_date + scheduled_time::time + (duration || ' minutes')::interval)::timestamp
)
WHERE booking_range IS NULL AND scheduled_date IS NOT NULL AND scheduled_time IS NOT NULL;

-- Auto-set booking_range on insert or update
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
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_booking_range ON bookings;
CREATE TRIGGER trg_set_booking_range
  BEFORE INSERT OR UPDATE OF scheduled_date, scheduled_time, duration
  ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION set_booking_range();

-- Exclusion constraint: same lawyer, overlapping time, only for active bookings
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS no_overlapping_bookings;
ALTER TABLE bookings ADD CONSTRAINT no_overlapping_bookings
  EXCLUDE USING gist (
    lawyer_id WITH =,
    booking_range WITH &&
  ) WHERE (status NOT IN ('cancelled', 'declined', 'completed'));

-- Index for fast lookup of expired pending bookings
CREATE INDEX IF NOT EXISTS idx_bookings_pending_expiry
  ON bookings (lawyer_id, scheduled_date, created_at)
  WHERE status = 'pending';

-- Clean up existing expired pending bookings (>15 min without payment)
UPDATE bookings
SET status = 'cancelled',
    updated_at = now()
WHERE status = 'pending'
  AND created_at < now() - interval '15 minutes';