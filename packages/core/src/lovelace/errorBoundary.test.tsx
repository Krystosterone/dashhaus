import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ErrorBoundary } from "./errorBoundary";

const Draw = ({ broken }: { broken: boolean }) => {
  if (broken) throw new Error("bad YAML");
  return <p>drawn</p>;
};

describe("ErrorBoundary", () => {
  it("says what stopped the card, and draws again once a new config fixes it", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { rerender } = render(<ErrorBoundary config={{ v: 1 }}><Draw broken /></ErrorBoundary>);
    expect(screen.getByRole("alert").textContent).toBe("The dashboard stopped: bad YAML");
    rerender(<ErrorBoundary config={{ v: 2 }}><Draw broken={false} /></ErrorBoundary>);
    expect(screen.getByText("drawn")).toBeTruthy();
    vi.restoreAllMocks();
  });
});
