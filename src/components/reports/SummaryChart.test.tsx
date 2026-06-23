import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { SummaryChart } from "./SummaryChart";
import type { ReportSeriesPoint } from "@/types";

function createPoints(count: number): ReportSeriesPoint[] {
  return Array.from({ length: count }, (_, index) => ({
    label: `${index + 1}`,
    seconds: (index + 1) * 60,
  }));
}

describe("SummaryChart", () => {
  it("週次相当の点数ではカード幅内で伸縮すること", () => {
    render(<SummaryChart points={createPoints(7)} period="week" />);

    expect(screen.getByTestId("summary-chart-bars")).not.toHaveStyle({
      width: "1054px",
    });
  });

  it("月次の推移だけ横スクロール用の内部幅を確保すること", () => {
    render(<SummaryChart points={createPoints(31)} period="month" />);

    expect(screen.getByTestId("summary-chart-frame")).toHaveClass(
      "overflow-x-auto",
    );
    expect(screen.getByTestId("summary-chart-bars")).toHaveStyle({
      width: "1054px",
    });
  });
});
