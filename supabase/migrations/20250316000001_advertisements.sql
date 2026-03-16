-- Advertisements table for admin-managed ad placements
create table public.advertisements (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  description text,
  image_url   text,
  html_content text,
  link_url    text,
  placement   text not null check (placement in ('homepage', 'search', 'listing')),
  status      text not null default 'active' check (status in ('active', 'inactive')),
  start_date  timestamptz not null default now(),
  end_date    timestamptz,
  sort_order  int not null default 0,
  click_count int not null default 0,
  impression_count int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Index for fetching active ads by placement
create index idx_advertisements_placement_active
  on public.advertisements (placement, status, start_date, end_date);

-- RLS: no public access, only service role
alter table public.advertisements enable row level security;
