import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import { LineChartFig } from "../src/components/charts/LineChartFig";
import { BarChartFig } from "../src/components/charts/BarChartFig";

test("LineChartFig renders an SVG with a line path", () => {
  const { container } = render(
    <div style={{ width: 640, height: 320 }}>
      <LineChartFig
        data={[
          { d: "2025-01", a: 10 },
          { d: "2025-02", a: 20 },
          { d: "2025-03", a: 15 },
        ]}
        xKey="d"
        series={[{ key: "a", label: "A", color: "#2a78d6" }]}
      />
    </div>,
  );
  expect(container.querySelector("svg")).toBeTruthy();
  expect(container.querySelector("path.recharts-curve")).toBeTruthy();
});

test("LineChartFig empty data renders nothing", () => {
  const { container } = render(<LineChartFig data={[]} xKey="d" series={[]} />);
  expect(container.querySelector("svg")).toBeNull();
});

test("BarChartFig renders bars and fires onBarClick", async () => {
  const onBarClick = vi.fn();
  const { container } = render(
    <div style={{ width: 640, height: 320 }}>
      <BarChartFig
        data={[
          { key: "a", label: "Альфа", value: 8 },
          { key: "b", label: "Бета", value: 3 },
        ]}
        onBarClick={onBarClick}
      />
    </div>,
  );
  const bar = container.querySelector("path.recharts-rectangle, .recharts-bar-rectangle path");
  expect(bar).toBeTruthy();
  await userEvent.click(bar as Element);
  expect(onBarClick).toHaveBeenCalledWith("a");
});
