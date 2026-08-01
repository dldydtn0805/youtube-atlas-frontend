import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AdminGameSettingsPanel from "./AdminGameSettingsPanel";

describe("AdminGameSettingsPanel", () => {
  it("saves the edited scheduled-sell default after confirmation", () => {
    const onSave = vi.fn();
    vi.spyOn(window, "confirm").mockReturnValue(true);

    render(
      <AdminGameSettingsPanel
        isLoading={false}
        isSaving={false}
        onSave={onSave}
        settings={{
          scheduledSellDefaultProfitRatePercent: 300,
          scheduledSellProfitRatePresets: [300, 500, 1000],
          updatedAt: null,
          updatedBy: null,
        }}
      />,
    );

    fireEvent.change(
      screen.getByRole("spinbutton", {
        name: "예약 매도 목표 수익률 기본값",
      }),
      { target: { value: "25.5" } },
    );
    fireEvent.change(
      screen.getByRole("spinbutton", {
        name: "예약 매도 샘플 수익률 1",
      }),
      { target: { value: "30" } },
    );
    fireEvent.click(screen.getByRole("button", { name: "수익률 설정 저장" }));

    expect(onSave).toHaveBeenCalledWith({
      scheduledSellDefaultProfitRatePercent: 25.5,
      scheduledSellProfitRatePresets: [30, 500, 1000],
    });
  });
});
