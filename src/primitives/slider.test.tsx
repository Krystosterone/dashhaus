import { fireEvent, render, within } from "@testing-library/react";
import type { KeyboardEvent } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { rangeKeyValue, trackPos, useRangeSlider, useSlider } from "./slider";
import type { SliderOptions } from "./slider";

type Opts = Omit<SliderOptions<HTMLDivElement>, "inset" | "valueText" | "onChange"> & { onChange: (v: number) => void };

function Probe(opts: Opts) {
  const s = useSlider<HTMLDivElement>({ inset: 0, valueText: (v) => `${v} percent`, ...opts });
  return (
    <div data-testid="root" {...s.rootProps}>
      <div data-testid="hit" {...s.hitProps} />
      <input aria-label="Level" {...s.inputProps} />
    </div>
  );
}

function RangeProbe({ onChange }: { onChange: (low: number, high: number) => void }) {
  const r = useRangeSlider<HTMLDivElement>({ low: 50, high: 70, min: 44.6, max: 95, step: 0.5, inset: 0, valueText: (v, thumb) => `${thumb} ${v}`, onChange });
  return (
    <div data-testid="root" {...r.rootProps}>
      <div data-testid="hit" {...r.hitProps} />
      <input aria-label="Heat below" {...r.lowInputProps} />
      <input aria-label="Cool above" {...r.highInputProps} />
    </div>
  );
}

const ptr = (eventType: string, x: number, pointerType: "mouse" | "touch", pointerId = 1) => {
  const e = new MouseEvent(eventType, { bubbles: true, clientX: x, button: 0 });
  Object.defineProperties(e, { pointerId: { value: pointerId }, pointerType: { value: pointerType } });
  return e;
};
/** A 100 px track from x = 0. */
const sized = (el: HTMLElement) => Object.defineProperty(el, "getBoundingClientRect", { value: () => ({ left: 0, width: 100 }) });
const mount = (opts: Partial<Opts> = {}) => {
  const onChange = vi.fn();
  const view = within(render(<Probe value={50} min={0} max={100} onChange={onChange} {...opts} />).container);
  sized(view.getByTestId("root"));
  return { onChange, root: view.getByTestId("root"), hit: view.getByTestId("hit"), input: view.getByRole("slider") as HTMLInputElement };
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
    expect(trackPos(60, { left: 10, width: 100 } as DOMRect, 10)).toBe(0.5);
  });
});

describe("rangeKeyValue", () => {
  const event = (key: string) => ({ key, preventDefault: vi.fn() }) as unknown as KeyboardEvent;

  it("steps from the current value and preserves irregular endpoints", () => {
    expect(rangeKeyValue(event("ArrowUp"), 70, 44.6, 95, 0.5)).toBe(70.5);
    expect(rangeKeyValue(event("ArrowDown"), 95, 44.6, 95, 0.5)).toBe(94.5);
    expect(rangeKeyValue(event("End"), 70, 44.6, 95, 0.5)).toBe(95);
  });
});

describe("useSlider", () => {
  it("jumps on mouse press with the animation on, then drags past the 4px threshold with it off", () => {
    const { onChange, root, hit } = mount();
    fireEvent(hit, ptr("pointerdown", 80, "mouse"));
    expect(onChange).toHaveBeenLastCalledWith(80);
    expect(root.getAttribute("data-anim")).toBe("");

    fireEvent(hit, ptr("pointermove", 82, "mouse"));
    expect(onChange).toHaveBeenCalledTimes(1); // under the threshold

    fireEvent(hit, ptr("pointermove", 30, "mouse"));
    expect(onChange).toHaveBeenLastCalledWith(30);
    expect(root.hasAttribute("data-anim")).toBe(false);

    fireEvent(hit, ptr("pointerup", 30, "mouse"));
    expect(onChange).toHaveBeenCalledTimes(2); // a drag end does not jump
  });

  it("sets nothing on a touch press, so a scroll that starts on the track changes nothing; a tap jumps on release", () => {
    const { onChange, root, hit } = mount();
    fireEvent(hit, ptr("pointerdown", 80, "touch"));
    expect(onChange).not.toHaveBeenCalled();
    fireEvent(hit, ptr("pointercancel", 80, "touch"));
    expect(onChange).not.toHaveBeenCalled();

    fireEvent(hit, ptr("pointerdown", 80, "touch"));
    fireEvent(hit, ptr("pointerup", 80, "touch"));
    expect(onChange).toHaveBeenCalledWith(80);
    expect(root.getAttribute("data-anim")).toBe("");
  });

  it("ignores a second pointer while one is captured", () => {
    const { onChange, hit } = mount();
    fireEvent(hit, ptr("pointerdown", 80, "mouse"));
    fireEvent(hit, ptr("pointerdown", 20, "mouse", 2));
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("reports a tap on the current value only when asked to", () => {
    const quiet = mount();
    fireEvent(quiet.hit, ptr("pointerdown", 50, "mouse"));
    expect(quiet.onChange).not.toHaveBeenCalled();
    fireEvent(quiet.hit, ptr("pointerup", 50, "mouse"));

    const loud = mount({ reportUnchanged: true });
    fireEvent(loud.hit, ptr("pointerdown", 50, "mouse"));
    expect(loud.onChange).toHaveBeenCalledWith(50);
  });

  it("maps and snaps through the skin's own functions, then keeps the result in range", () => {
    const { onChange, hit } = mount({ along: (x, r) => Math.abs(x - (r.left + r.width / 2)) / (r.width / 2), snap: (raw) => (raw >= 97 ? 120 : Math.round(raw)) });
    fireEvent(hit, ptr("pointerdown", 10, "mouse"));
    expect(onChange).toHaveBeenLastCalledWith(80);
    fireEvent(hit, ptr("pointerup", 10, "mouse"));
    fireEvent(hit, ptr("pointerdown", 99, "mouse"));
    expect(onChange).toHaveBeenLastCalledWith(100);
  });

  it("steps the keyboard from the value with the animation off", () => {
    const { onChange, root, hit, input } = mount({ value: 50, min: 1, max: 100 });
    fireEvent(hit, ptr("pointerdown", 80, "mouse"));
    fireEvent.keyDown(input, { key: "ArrowRight" });
    expect(onChange).toHaveBeenLastCalledWith(51);
    expect(root.hasAttribute("data-anim")).toBe(false);
    fireEvent.keyDown(input, { key: "PageDown" });
    expect(onChange).toHaveBeenLastCalledWith(40);
  });

  it("reads the value out through the skin's words", () => {
    expect(mount({ value: 42 }).input.getAttribute("aria-valuetext")).toBe("42 percent");
  });

  it("keeps the native step on the grid and takes step=any off it", () => {
    expect(mount({ value: 50, min: 1, max: 100 }).input.getAttribute("step")).toBe("1");
    expect(mount({ value: 2700, min: 2202, max: 6535, step: 100 }).input.getAttribute("step")).toBe("any");
  });

  it("takes no pointer and no input while disabled", () => {
    const { onChange, hit, input } = mount({ disabled: true });
    fireEvent(hit, ptr("pointerdown", 80, "mouse"));
    expect(onChange).not.toHaveBeenCalled();
    expect(input.disabled).toBe(true);
    expect(hit.getAttribute("aria-hidden")).toBe("true");
  });
});

describe("useRangeSlider", () => {
  it("anchors pointer steps to the minimum", () => {
    const onChange = vi.fn();
    const { getByTestId } = render(<RangeProbe onChange={onChange} />);
    sized(getByTestId("root"));
    fireEvent(getByTestId("hit"), ptr("pointerdown", 1, "mouse"));
    expect(onChange).toHaveBeenCalledWith(45.1, 70);
  });

  it("keeps low <= high from the keyboard", () => {
    const onChange = vi.fn();
    const { getByRole } = render(<RangeProbe onChange={onChange} />);
    fireEvent.keyDown(getByRole("slider", { name: "Heat below" }), { key: "End" });
    expect(onChange).toHaveBeenLastCalledWith(70, 70);
    fireEvent.keyDown(getByRole("slider", { name: "Cool above" }), { key: "Home" });
    expect(onChange).toHaveBeenLastCalledWith(50, 50);
  });
});
