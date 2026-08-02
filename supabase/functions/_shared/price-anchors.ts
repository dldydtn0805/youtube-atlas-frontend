import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.99.2';
import {
  DEFAULT_PRICE_ANCHORS,
  type PriceAnchor,
} from './game.ts';

interface PriceAnchorRow {
  price_points: number;
  rank: number;
}

const priceAnchorPromises = new WeakMap<
  SupabaseClient,
  Promise<PriceAnchor[]>
>();

async function fetchPriceAnchors(service: SupabaseClient): Promise<PriceAnchor[]> {
  const { data, error } = await service
    .from('game_price_anchors')
    .select('rank, price_points')
    .order('rank', { ascending: true });

  if (error) throw error;

  if (!data?.length) {
    return DEFAULT_PRICE_ANCHORS.map(([rank, pricePoints]) => [rank, pricePoints]);
  }

  return (data as PriceAnchorRow[]).map(({ price_points: pricePoints, rank }) => [
    rank,
    Number(pricePoints),
  ]);
}

export function loadPriceAnchors(service: SupabaseClient): Promise<PriceAnchor[]> {
  const cached = priceAnchorPromises.get(service);

  if (cached) {
    return cached;
  }

  const pending = fetchPriceAnchors(service);
  priceAnchorPromises.set(service, pending);
  void pending.catch(() => {
    if (priceAnchorPromises.get(service) === pending) {
      priceAnchorPromises.delete(service);
    }
  });

  return pending;
}
