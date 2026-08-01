update public.game_price_anchors as anchor
set
  price_points = pretty.price_points,
  updated_at = now(),
  updated_by = 'system:pretty-million-v1'
from (
  values
    (1, 1000000::bigint),
    (2, 900000::bigint),
    (3, 850000::bigint),
    (4, 800000::bigint),
    (5, 750000::bigint),
    (6, 720000::bigint),
    (7, 690000::bigint),
    (8, 660000::bigint),
    (9, 630000::bigint),
    (10, 600000::bigint),
    (20, 500000::bigint),
    (30, 420000::bigint),
    (40, 350000::bigint),
    (50, 300000::bigint),
    (60, 250000::bigint),
    (70, 210000::bigint),
    (80, 180000::bigint),
    (90, 150000::bigint),
    (100, 125000::bigint),
    (110, 105000::bigint),
    (120, 90000::bigint),
    (130, 78000::bigint),
    (140, 68000::bigint),
    (150, 60000::bigint),
    (160, 54000::bigint),
    (170, 50000::bigint),
    (180, 46000::bigint),
    (190, 43000::bigint),
    (200, 40000::bigint)
) as pretty(rank, price_points)
where anchor.rank = pretty.rank;
