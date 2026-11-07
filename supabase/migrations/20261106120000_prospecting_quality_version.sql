-- LegalUp Pro — versión de reglas de calidad de prospección
--
-- Migración aditiva: los prospectos históricos quedan con
-- quality_rules_version en null y no son elegibles para envío hasta que se
-- ejecute una reevaluación explícita.

alter table public.prospects
  add column if not exists quality_rules_version text;

create index if not exists prospects_quality_rules_version_idx
  on public.prospects (quality_rules_version)
  where quality_rules_version is not null;

alter table public.prospects
  drop constraint if exists prospects_quality_version_requires_evaluation;

alter table public.prospects
  add constraint prospects_quality_version_requires_evaluation
  check (quality_rules_version is null or quality_evaluated_at is not null);

comment on column public.prospects.quality_rules_version is
  'Versión de las reglas de calidad aplicadas; null significa pendiente de reevaluación.';
