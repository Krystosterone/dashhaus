import { fireEvent, render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { dialAngle, dialFraction, dialPosition, stepValue, pointerAngle, useDial } from "./useDial";

describe("dial geometry", () => {
  it("spans 240° centred on the top", () => {
    expect(dialAngle(0)).toBe(-120);
    expect(dialAngle(0.5)).toBe(0);
    expect(dialAngle(1)).toBe(120);
    expect(dialAngle(2)).toBe(120);
  });

  it("measures a point clockwise from straight up", () => {
    expect(pointerAngle(50, 0, 50, 50)).toBe(0);
    expect(pointerAngle(100, 50, 50, 50)).toBe(90);
    expect(pointerAngle(0, 50, 50, 50)).toBe(-90);
    expect(pointerAngle(50, 100, 50, 50)).toBe(180);
  });

  it("sends a press in the open bottom to the nearer end", () => {
    expect(dialFraction(0)).toBe(0.5);
    expect(dialFraction(-120)).toBe(0);
    expect(dialFraction(150)).toBe(1);
    expect(dialFraction(-150)).toBe(0);
    expect(dialFraction(180)).toBe(1);
  });

  it("lands on the step grid inside the limits, without float residue", () => {
    expect(stepValue(0.5, 16, 30, 0.5)).toBe(23);
    expect(stepValue(0.52, 16, 30, 0.5)).toBe(23.5);
    expect(stepValue(1 / 3, 7, 35, 0.1)).toBe(16.3);
    expect(stepValue(1.4, 16, 30, 1)).toBe(30);
    expect(stepValue(-1, 16, 30, 1)).toBe(16);
  });

  it("places a value along the arc, and a degenerate range at the start", () => {
    expect(dialPosition(23, 16, 30)).toBe(0.5);
    expect(dialPosition(40, 16, 30)).toBe(1);
    expect(dialPosition(20, 20, 20)).toBe(0);
  });
});

function Harness({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const dial = useDial<HTMLDivElement>({ value, min: 10, max: 30, step: 1, onChange });
  return (
    <div data-testid="dial" ref={dial.ref}>
      <output data-testid="shown">{dial.shown}</output>
      <span data-testid="ring" {...dial.ring} />
      <span data-testid="thumb" {...dial.thumb} />
    </div>
  );
}

const ptr = (type: string, x: number, y: number) => {
  const e = new MouseEvent(type, { bubbles: true, clientX: x, clientY: y, button: 0 });
  Object.defineProperty(e, "pointerId", { value: 1 });
  return e;
};

beforeEach(() => {
  Object.defineProperty(Element.prototype, "setPointerCapture", { value: vi.fn(), configurable: true });
  // A 100 px dial at the origin: its centre is (50, 50).
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue({ left: 0, top: 0, width: 100, height: 100, right: 100, bottom: 100, x: 0, y: 0, toJSON: () => ({}) });
});

describe("useDial", () => {
  it("previews a drag and reports once, on release", () => {
    const onChange = vi.fn();
    const { getByTestId } = render(<Harness value={20} onChange={onChange} />);

    fireEvent(getByTestId("thumb"), ptr("pointerdown", 50, 0));
    fireEvent(getByTestId("thumb"), ptr("pointermove", 100, 50)); // 90°: (90 + 120) / 240 = 0.875 along, 27.5
    expect(getByTestId("shown").textContent).toBe("28");
    expect(onChange).not.toHaveBeenCalled();

    fireEvent(getByTestId("thumb"), ptr("pointerup", 100, 50));
    expect(onChange).toHaveBeenCalledOnce();
    expect(onChange).toHaveBeenCalledWith(28);
  });

  it("drops a cancelled drag without reporting", () => {
    const onChange = vi.fn();
    const { getByTestId } = render(<Harness value={20} onChange={onChange} />);
    fireEvent(getByTestId("thumb"), ptr("pointerdown", 50, 0));
    fireEvent(getByTestId("thumb"), ptr("pointermove", 0, 50));
    fireEvent(getByTestId("thumb"), ptr("pointercancel", 0, 50));
    expect(getByTestId("shown").textContent).toBe("20");
    expect(onChange).not.toHaveBeenCalled();
  });

  it("jumps where the ring is tapped", () => {
    const onChange = vi.fn();
    const { getByTestId } = render(<Harness value={20} onChange={onChange} />);
    fireEvent(getByTestId("ring"), ptr("pointerdown", 0, 50));
    fireEvent(getByTestId("ring"), ptr("pointerup", 0, 50)); // -90°: 0.125 along, 12.5
    expect(onChange).toHaveBeenCalledWith(13);
  });

  it("ignores a press that moves, as a scroll across the ring does", () => {
    const onChange = vi.fn();
    const { getByTestId } = render(<Harness value={20} onChange={onChange} />);
    fireEvent(getByTestId("ring"), ptr("pointerdown", 0, 50));
    fireEvent(getByTestId("ring"), ptr("pointerup", 0, 80));
    expect(onChange).not.toHaveBeenCalled();
  });
});
