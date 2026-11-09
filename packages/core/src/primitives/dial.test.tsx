import { act, fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { dialValue, useDial } from "./dial";
import type { DialOptions } from "./dial";

const range = { top: 175, min: 0, max: 350 };

describe("dialValue", () => {
  it("reads the angle clockwise from the top, added to the top's value", () => {
    expect(dialValue(0, -50, range)).toBe(175);
    expect(dialValue(50, 0, range)).toBe(265);
    expect(dialValue(-50, 0, range)).toBe(85);
    expect(dialValue(0, 50, { top: 180, min: 5, max: 355 })).toBe(355);
  });

  it("takes the nearer end across the gap a range short of a turn leaves", () => {
    // Straight down from a top of 175 is 355, in the gap between 350 and 0 (360): just right of it is nearer 350,
    // just left of it, past 355 the long way round, nearer 0.
    expect(dialValue(1, 50, range)).toBe(350);
    expect(dialValue(-1, 50, range)).toBe(0);
  });
});

function Dial(options: Omit<DialOptions, "top" | "min" | "max">) {
  const dial = useDial<HTMLDivElement>({ ...range, step: 5, valueText: (v) => `${v} degrees`, ...options });
  return (
    <>
      <input aria-label="Aim" {...dial.inputProps} />
      <div data-testid="root" data-shown={dial.shown} {...dial.rootProps} />
    </>
  );
}

const box = (el: Element) => vi.spyOn(el, "getBoundingClientRect").mockReturnValue({ left: 0, top: 0, width: 100, height: 100, right: 100, bottom: 100, x: 0, y: 0, toJSON: () => ({}) });

describe("useDial", () => {
  it("follows a drag while held and sends its value once, when let go", () => {
    const onChange = vi.fn();
    const { getByTestId } = render(<Dial value={175} onChange={onChange} />);
    const root = getByTestId("root");
    box(root);
    act(() => { fireEvent.pointerDown(root, { pointerId: 1, clientX: 100, clientY: 50 }); });
    expect(root.getAttribute("data-shown")).toBe("265");
    expect(root.hasAttribute("data-dragging")).toBe(true);
    act(() => { fireEvent.pointerMove(root, { pointerId: 1, clientX: 0, clientY: 50 }); });
    expect(root.getAttribute("data-shown")).toBe("85");
    expect(onChange).not.toHaveBeenCalled();
    act(() => { fireEvent.pointerUp(root, { pointerId: 1 }); });
    expect(onChange).toHaveBeenCalledWith(85);
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("sends nothing for a press let go where it was, and nothing while disabled", () => {
    const onChange = vi.fn();
    const { getByTestId, rerender } = render(<Dial value={175} onChange={onChange} />);
    const root = getByTestId("root");
    box(root);
    act(() => { fireEvent.pointerDown(root, { pointerId: 1, clientX: 50, clientY: 0 }); });
    act(() => { fireEvent.pointerUp(root, { pointerId: 1 }); });
    rerender(<Dial value={175} disabled onChange={onChange} />);
    act(() => { fireEvent.pointerDown(root, { pointerId: 2, clientX: 100, clientY: 50 }); });
    act(() => { fireEvent.pointerUp(root, { pointerId: 2 }); });
    expect(onChange).not.toHaveBeenCalled();
  });

  it("takes the keyboard on its hidden range, each step sent at once", () => {
    const onChange = vi.fn();
    const { getByLabelText } = render(<Dial value={175} onChange={onChange} />);
    const input = getByLabelText("Aim");
    expect(input.getAttribute("aria-valuetext")).toBe("175 degrees");
    expect(input.getAttribute("step")).toBe("5");
    fireEvent.change(input, { target: { value: "170" } });
    expect(onChange).toHaveBeenCalledWith(170);
  });
});
