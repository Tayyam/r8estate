-- Fields the app reads/writes on companies but were missing from the initial schema.
alter table public.companies
  add column if not exists "totalRating" double precision not null default 0,
  add column if not exists "totalReviews" integer not null default 0,
  add column if not exists "coverImageUrl" text,
  add column if not exists verified boolean not null default false;

comment on column public.companies."totalRating" is 'Denormalized average review score (1–5).';
comment on column public.companies."totalReviews" is 'Denormalized count of reviews.';
comment on column public.companies."coverImageUrl" is 'Optional hero/cover image URL.';
comment on column public.companies.verified is 'Shown as verified company in the UI.';
