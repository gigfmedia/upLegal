-- LegalUp Pro — calidad de prospección y límites estrictos
--
-- Migración aditiva: no modifica ni elimina los prospectos existentes.
-- Los registros previos quedan con columnas nuevas en null/false hasta que
-- se ejecute una reevaluación explícita y no destructiva.

alter table public.prospecting_settings
  add column if not exists allow_multiple_contacts_per_firm boolean not null default false;

alter table public.prospects
  add column if not exists email_kind text
    check (email_kind in ('personal', 'firm', 'role', 'third_party', 'invalid')),
  add column if not exists org_type text
    check (org_type in ('law_firm', 'public_entity', 'school', 'portal', 'directory', 'other')),
  add column if not exists rejection_reason text,
  add column if not exists discovery_query text,
  add column if not exists search_rank integer,
  add column if not exists person_key text,
  add column if not exists domain_key text,
  add column if not exists mailbox_verified boolean not null default false,
  add column if not exists quality_evaluated_at timestamptz;

create index if not exists prospects_person_key_idx
  on public.prospects (person_key)
  where person_key is not null;
create index if not exists prospects_domain_key_idx
  on public.prospects (domain_key)
  where domain_key is not null;
create index if not exists prospects_email_kind_idx
  on public.prospects (email_kind);
create index if not exists prospects_org_type_idx
  on public.prospects (org_type);

comment on column public.prospecting_settings.allow_multiple_contacts_per_firm is
  'Si es false, la elegibilidad permite solo un prospecto por dominio/estudio y una persona por campaña.';
comment on column public.prospects.email_kind is
  'Clasificación del correo: personal, firma, rol/genérico, tercero o inválido.';
comment on column public.prospects.org_type is
  'Tipo de organización detectada; solo law_firm es elegible para contacto.';
comment on column public.prospects.mailbox_verified is
  'MX valida el dominio, no la casilla. Se mantiene false salvo verificación externa.';
