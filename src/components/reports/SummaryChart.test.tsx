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
    render(<SummaryChart points={createPoints(7)} />);

    expect(screen.getByTestId("summary-chart-bars")).not.toHaveStyle({
      width: "238px",
    });
  });

  it("月次相当の点数では横スクロール用の内部幅を確保すること", () => {
    render(<SummaryChart points={createPoints(31)} />);

    expect(screen.getByTestId("summary-chart-scroll")).toHaveClass(
      "overflow-x-auto",
    );
    expect(screen.getByTestId("summary-chart-bars")).toHaveStyle({
      width: "1054px",
    });
  });
});
