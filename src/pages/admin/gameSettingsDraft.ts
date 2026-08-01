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

export function parseScheduledSellProfitRatePresets(values: string[]) {
  if (values.length !== 3) {
    throw new Error("예약 매도 샘플 수익률은 3개가 필요합니다.");
  }

  const presets = values.map((value) => {
    const normalizedValue = value.trim();
    const profitRatePercent = Number(normalizedValue);

    if (
      normalizedValue.length === 0 ||
      !Number.isFinite(profitRatePercent) ||
      profitRatePercent < 0
    ) {
      throw new Error("예약 매도 샘플 수익률은 0 이상의 숫자여야 합니다.");
    }

    return profitRatePercent;
  });

  if (presets.some((preset, index) => index > 0 && preset <= presets[index - 1])) {
    throw new Error(
      "예약 매도 샘플 수익률은 낮은 값부터 중복 없이 입력해야 합니다.",
    );
  }

  return presets;
}
