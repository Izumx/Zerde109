import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import App from "../src/App";

test("App renders", () => {
  render(<App />);
  expect(screen.getByText(/Zerde 109/)).toBeInTheDocument();
});
