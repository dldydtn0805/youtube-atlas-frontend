update public.game_price_anchors as anchor
set
  price_points = balanced.price_points,
  updated_at = now(),
  updated_by = 'system:balanced-v1'
from (
  values
    (1, 2000000::bigint),
    (2, 1700000::bigint),
    (3, 1550000::bigint),
    (4, 1440000::bigint),
    (5, 1350000::bigint),
    (6, 1280000::bigint),
    (7, 1220000::bigint),
    (8, 1160000::bigint),
    (9, 1100000::bigint),
    (10, 1050000::bigint),
    (20, 850000::bigint),
    (30, 700000::bigint),
    (40, 580000::bigint),
    (50, 480000::bigint),
    (60, 400000::bigint),
    (70, 335000::bigint),
    (80, 280000::bigint),
    (90, 235000::bigint),
    (100, 200000::bigint),
    (110, 170000::bigint),
    (120, 145000::bigint),
    (130, 125000::bigint),
    (140, 108000::bigint),
    (150, 93000::bigint),
    (160, 80000::bigint),
    (170, 70000::bigint),
    (180, 61000::bigint),
    (190, 55000::bigint),
    (200, 50000::bigint)
) as balanced(rank, price_points)
where anchor.rank = balanced.rank;
