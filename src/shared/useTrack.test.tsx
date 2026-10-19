import { fireEvent, render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { trackPos, useTrack } from "./useTrack";

function Harness({ pick }: { pick: (clientX: number, root: HTMLDivElement, phase: "jump" | "drag", x0: number) => void }) {
  const { ref, handlers, onKeyDown } = useTrack<HTMLDivElement>(pick);
  // eslint-disable-next-line jsx-a11y/no-static-element-interactions -- test-only harness; production tracks carry a real range input for keyboard use.
  return <div data-testid="track" ref={ref} {...handlers} onKeyDown={onKeyDown} />;
}

const ptr = (eventType: string, x: number, pointerType: "mouse" | "touch") => {
  const e = new MouseEvent(eventType, { bubbles: true, clientX: x, button: 0 });
  Object.defineProperties(e, {
    pointerId: { value: 1 },
    pointerType: { value: pointerType },
  });
  return e;
};

beforeEach(() => {
  Object.defineProperty(Element.prototype, "setPointerCapture", { value: vi.fn(), configurable: true });
});

describe("trackPos", () => {
  const r = { left: 0, width: 100 } as DOMRect;
  it("maps the middle", () => {
    expect(trackPos(50, r, 0)).toBe(0.5);
  });
  it("clamps outside clicks to 0 and 1", () => {
    expect(trackPos(-10, r, 0)).toBe(0);
    expect(trackPos(500, r, 0)).toBe(1);
  });
  it("excludes the inset from the usable length", () => {
    const rr = { left: 10, width: 100 } as DOMRect;
    expect(trackPos(60, rr, 10)).toBe(0.5);
  });
});

describe("useTrack", () => {
  it("jumps on mouse press, then drags past the 4px threshold", () => {
    const pick = vi.fn();
    const { getByTestId } = render(<Harness pick={pick} />);
    const el = getByTestId("track");

    fireEvent(el, ptr("pointerdown", 100, "mouse"));
    expect(pick).toHaveBeenCalledTimes(1);
    expect(pick.mock.calls[0][2]).toBe("jump");
    expect(el.getAttribute("data-anim")).toBe("");

    fireEvent(el, ptr("pointermove", 102, "mouse"));
    expect(pick).toHaveBeenCalledTimes(1); // under the threshold

    fireEvent(el, ptr("pointermove", 150, "mouse"));
    expect(pick).toHaveBeenCalledTimes(2);
    expect(pick.mock.calls[1][2]).toBe("drag");
    expect(pick.mock.calls[1][3]).toBe(100); // x0 from the press
    expect(el.hasAttribute("data-anim")).toBe(false);

    fireEvent(el, ptr("pointerup", 150, "mouse"));
    expect(pick).toHaveBeenCalledTimes(2); // a drag end does not jump
  });

  it("taps on touch release, not on touch press", () => {
    const pick = vi.fn();
    const { getByTestId } = render(<Harness pick={pick} />);
    const el = getByTestId("track");

    fireEvent(el, ptr("pointerdown", 100, "touch"));
    expect(pick).not.toHaveBeenCalled();

    fireEvent(el, ptr("pointerup", 100, "touch"));
    expect(pick).toHaveBeenCalledTimes(1);
    expect(pick.mock.calls[0][2]).toBe("jump");
    expect(el.getAttribute("data-anim")).toBe("");
  });

  it("ignores a second pointer while one is captured", () => {
    const pick = vi.fn();
    const { getByTestId } = render(<Harness pick={pick} />);
    const el = getByTestId("track");

    fireEvent(el, ptr("pointerdown", 100, "mouse"));
    const other = new MouseEvent("pointerdown", { bubbles: true, clientX: 40, button: 0 });
    Object.defineProperties(other, { pointerId: { value: 2 }, pointerType: { value: "mouse" } });
    fireEvent(el, other);
    expect(pick).toHaveBeenCalledTimes(1);
  });
});
