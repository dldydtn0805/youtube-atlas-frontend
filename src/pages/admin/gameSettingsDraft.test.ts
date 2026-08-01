import { describe, expect, it } from "vitest";
import {
  parseScheduledSellDefaultProfitRatePercent,
  parseScheduledSellProfitRatePresets,
} from "./gameSettingsDraft";

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

describe("parseScheduledSellProfitRatePresets", () => {
  it("accepts three ascending profit-rate presets", () => {
    expect(parseScheduledSellProfitRatePresets(["25.5", "50", "100"])).toEqual([
      25.5, 50, 100,
    ]);
  });

  it("rejects missing, negative, duplicate, and descending presets", () => {
    expect(() => parseScheduledSellProfitRatePresets(["25", "50"])).toThrow(
      "예약 매도 샘플 수익률은 3개가 필요합니다.",
    );
    expect(() => parseScheduledSellProfitRatePresets(["-1", "50", "100"])).toThrow();
    expect(() => parseScheduledSellProfitRatePresets(["25", "25", "100"])).toThrow(
      "예약 매도 샘플 수익률은 낮은 값부터 중복 없이 입력해야 합니다.",
    );
    expect(() => parseScheduledSellProfitRatePresets(["100", "50", "25"])).toThrow();
  });
});
