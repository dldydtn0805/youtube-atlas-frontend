import { describe, expect, it } from "vitest";
import { parseScheduledSellDefaultProfitRatePercent } from "./gameSettingsDraft";

describe("parseScheduledSellDefaultProfitRatePercent", () => {
  it("accepts zero and decimal profit rates", () => {
    expect(parseScheduledSellDefaultProfitRatePercent("0")).toBe(0);
    expect(parseScheduledSellDefaultProfitRatePercent("12.5")).toBe(12.5);
  });

  it("rejects empty, negative, and non-numeric values", () => {
    expect(() => parseScheduledSellDefaultProfitRatePercent("")).toThrow(
      "예약 매도 기본 수익률은 0 이상의 숫자여야 합니다.",
    );
    expect(() => parseScheduledSellDefaultProfitRatePercent("-1")).toThrow();
    expect(() => parseScheduledSellDefaultProfitRatePercent("abc")).toThrow();
  });
});
