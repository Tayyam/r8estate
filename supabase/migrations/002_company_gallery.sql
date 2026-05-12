-- Company photo gallery (URLs stored in Postgres; binary files in storage bucket `media`).
alter table public.companies
  add column if not exists "galleryImages" text[] not null default '{}';
