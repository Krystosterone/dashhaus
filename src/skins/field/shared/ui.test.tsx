import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Key, ModuleFrame, Today, useDetails } from "./ui";
import type { FieldFootprint } from "./ui";

function Probe({ footprint, defaultOpen, warning, note }: { footprint?: FieldFootprint; defaultOpen?: boolean; warning?: string; note?: string }) {
  const details = useDetails(defaultOpen);
  return (
    <ModuleFrame
      kind="fd-zz"
      name="Probe"
      area="Hall"
      footprint={footprint}
      state="on"
      warning={warning}
      note={note}
      details={details}
      pict={<i data-testid="pict" />}
      read="ON"
      meta={["Since 10:31"]}
      lead={<b data-testid="lead" />}
      row={<b data-testid="row" />}
    >
      <p>Inside</p>
    </ModuleFrame>
  );
}

describe("ModuleFrame", () => {
  // jsdom has no modal dialog; these do what a browser's do to the `open` attribute.
  beforeEach(() => {
    HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) { this.setAttribute("open", ""); };
    HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) { this.removeAttribute("open"); };
  });

  it("draws a standard module as the screen with its meta lines, then the row", () => {
    const { container } = render(<Probe />);
    expect(container.querySelector(".fd-meta")?.textContent).toBe("Since 10:31");
    expect(screen.getByTestId("row")).toBeTruthy();
    expect(screen.queryByTestId("lead")).toBeNull();
  });

  it("draws a compact row as the lead and the screen, with no meta line or row", () => {
    const { container } = render(<Probe footprint="compact" />);
    expect(container.querySelector(".fd-module")?.getAttribute("data-footprint")).toBe("compact");
    expect(screen.getByTestId("lead")).toBeTruthy();
    expect(container.querySelector(".fd-meta")).toBeNull();
    expect(screen.queryByTestId("row")).toBeNull();
  });

  it("opens its details from the name, and closes them", async () => {
    render(<Probe />);
    expect(screen.queryByText("Inside")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Probe details" }));
    expect(screen.getByRole("dialog", { name: "Probe details" }).textContent).toContain("Inside");
    fireEvent.click(screen.getByRole("button", { name: "Close Probe details" }));
    await waitFor(() => expect(screen.queryByText("Inside")).toBeNull());
  });

  it("prints a note in place of the area, a warning before either, and keeps the area in the panel", () => {
    const { container, rerender } = render(<Probe note="Base off" defaultOpen />);
    expect(container.querySelector(".fd-module .fd-area")?.textContent).toBe("Base off");
    expect(screen.getByRole("dialog", { name: "Probe details" }).querySelector(".fd-area")?.textContent).toBe("Hall");
    rerender(<Probe note="Base off" warning="Sock off" defaultOpen />);
    expect(container.querySelector(".fd-module .fd-area")?.textContent).toBe("Warning: Sock off");
  });

  it("opens on first render with defaultOpen", () => {
    render(<Probe defaultOpen />);
    expect(screen.getByText("Inside")).toBeTruthy();
  });
});

describe("Key", () => {
  it("lies flat while unavailable but stays focusable: a tap does nothing, a hold still opens the details", () => {
    vi.useFakeTimers();
    const onPress = vi.fn();
    const onHold = vi.fn();
    render(<Key label="Lamp" pressed unavailable onPress={onPress} onHold={onHold}>{null}</Key>);
    const key = screen.getByRole("button", { name: "Lamp" }) as HTMLButtonElement;
    expect(key.disabled).toBe(false);
    expect(key.getAttribute("aria-disabled")).toBe("true");
    expect(key.querySelector(".fd-led")?.getAttribute("data-lit")).toBe("false");
    fireEvent.click(key);
    expect(onPress).not.toHaveBeenCalled();
    fireEvent.pointerDown(key, { button: 0 });
    act(() => vi.advanceTimersByTime(450));
    expect(onHold).toHaveBeenCalledOnce();
    vi.useRealTimers();
  });

  it("marks the chosen key of a group as pressed, and pressing it again does nothing", () => {
    const onPress = vi.fn();
    render(<Key label="Home" chosen onPress={onPress} caption="Home">{null}</Key>);
    const key = screen.getByRole("button", { name: "Home" });
    expect(key.getAttribute("aria-pressed")).toBe("true");
    expect(key.hasAttribute("data-chosen")).toBe(true);
    fireEvent.click(key);
    expect(onPress).not.toHaveBeenCalled();
  });
});

describe("Today", () => {
  it("marks the hours known ahead from aheadFrom, and none without it", () => {
    const samples = [0, 0.5, 1, 0.25, null];
    const { container, rerender } = render(<Today label="Busy today." samples={samples} currentHour={1} aheadFrom={2} tone="neutral" />);
    const ahead = [...container.querySelectorAll(".fd-meter-h")].map((h) => h.hasAttribute("data-ahead"));
    expect(ahead.slice(0, 5)).toEqual([false, false, true, true, false]);
    rerender(<Today label="Busy today." samples={samples} currentHour={1} tone="neutral" />);
    expect(container.querySelector(".fd-meter-h[data-ahead]")).toBeNull();
  });
});
