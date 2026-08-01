export function parseScheduledSellDefaultProfitRatePercent(value: string) {
  const normalizedValue = value.trim();
  const profitRatePercent = Number(normalizedValue);

  if (
    normalizedValue.length === 0 ||
    !Number.isFinite(profitRatePercent) ||
    profitRatePercent < 0
  ) {
    throw new Error("예약 매도 기본 수익률은 0 이상의 숫자여야 합니다.");
  }

  return profitRatePercent;
}
