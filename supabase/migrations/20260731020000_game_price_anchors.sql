create table if not exists public.game_price_anchors (
  rank integer primary key check (rank between 1 and 200),
  price_points bigint not null check (price_points > 0),
  updated_at timestamptz not null default now(),
  updated_by text
);

insert into public.game_price_anchors (rank, price_points)
values
  (1, 2000000),
  (2, 1333333),
  (3, 1320000),
  (4, 1300000),
  (5, 1270000),
  (6, 1240000),
  (7, 1200000),
  (8, 1150000),
  (9, 1100000),
  (10, 1050000),
  (20, 750000),
  (30, 550000),
  (40, 400000),
  (50, 290000),
  (60, 210000),
  (70, 150000),
  (80, 110000),
  (90, 80000),
  (100, 58000),
  (110, 42000),
  (120, 31000),
  (130, 23000),
  (140, 17000),
  (150, 13000),
  (160, 10000),
  (170, 7500),
  (180, 5500),
  (190, 4000),
  (200, 3000)
on conflict (rank) do nothing;

alter table public.game_price_anchors enable row level security;

revoke all on table public.game_price_anchors from anon, authenticated;
