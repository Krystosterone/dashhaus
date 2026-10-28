import { act, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useSheet } from "./sheet";

function Probe({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { mounted, dialogProps } = useSheet({ open, label: "Probe", onClose, closeMs: 200, phone: "(max-width: 600px)", handle: ".head", snapBack: "none" });
  return <dialog {...dialogProps}>{mounted && <p className="head">Inside</p>}</dialog>;
}

beforeEach(() => {
  vi.useFakeTimers();
  // jsdom has no modal dialog; these do what a browser's do to the `open` attribute.
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) { this.removeAttribute("open"); };
  window.matchMedia ??= ((query: string) => ({ matches: false, media: query })) as unknown as typeof window.matchMedia;
});
afterEach(() => vi.useRealTimers());

describe("useSheet", () => {
  it("mounts its content on open, locks page scroll, and unmounts after the exit time", () => {
    const { container, rerender } = render(<Probe open onClose={() => {}} />);
    expect(container.textContent).toBe("Inside");
    expect(container.querySelector("dialog")?.getAttribute("aria-label")).toBe("Probe");
    expect(document.documentElement.style.overflow).toBe("hidden");
    rerender(<Probe open={false} onClose={() => {}} />);
    expect(container.querySelector("dialog")?.hasAttribute("data-closing")).toBe(true);
    act(() => vi.advanceTimersByTime(200));
    expect(container.textContent).toBe("");
    expect(document.documentElement.style.overflow).toBe("");
  });

  it("closes on Escape and on a click outside the panel, not on one inside it", () => {
    const onClose = vi.fn();
    const { container } = render(<Probe open onClose={onClose} />);
    const dialog = container.querySelector("dialog")!;
    dialog.getBoundingClientRect = () => ({ left: 10, right: 110, top: 10, bottom: 110 }) as DOMRect;
    fireEvent.click(dialog, { clientX: 50, clientY: 50 });
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(dialog, { clientX: 200, clientY: 50 });
    fireEvent(dialog, new Event("cancel", { cancelable: true }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
