-- FASE 4.32B.2 — Founder cohort badge (recognition only).
-- Lawyer-level flag, separate from lawyer_subscriptions.is_founder (slot metadata).
-- NEVER read by billing, entitlement, or case-gate logic.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_founder boolean NOT NULL DEFAULT false;

-- Deterministic backfill: first 15 non-test lawyer accounts by created_at.
-- Excluded: test-lawyer-a/b fixtures, rrettig (rank 16), Juan Guajardo owner (rank 17).
UPDATE public.profiles SET is_founder = true WHERE id IN (
  '0bc63911-b1da-4f26-ba4a-4c115befb1ba',
  'bd7b63c8-a482-49e6-88f1-f462bf1605f9',
  'ce1762fa-e97f-4fb0-a782-b2db4d6046bf',
  '64884560-4447-4e60-add1-b3af26f31f0d',
  'ba62e318-c8ef-4f24-a8df-92de72c85ddf',
  '2fbae23d-f04e-4727-a2f1-9302566533c1',
  '976c4198-6903-451f-b39c-f362cffa1044',
  'b1773d6b-eb06-4268-9c2e-b4d27e165e86',
  'f517d831-e44e-4a12-909d-90deb016bed8',
  'ee73656d-4ac9-4119-8873-1e27d1bb2118',
  '7a1f4cce-77e7-4390-9299-31ba6bfe11b5',
  '4856c340-6e33-4333-99ac-e10c17856c7c',
  'f441785d-8897-424d-9824-f9bd5bd56c50',
  '03060fc4-bd5b-4e3c-9c07-3a30c179cd3c',
  '09fd2157-1209-422f-8c0b-05d01dff003e'
);
