import { act, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { usePress } from "./press";
import type { PressOptions } from "./press";

function Probe(props: PressOptions) {
  return <button {...usePress(props)}>Press</button>;
}

const setup = (props: Partial<PressOptions> = {}) => {
  const onPress = vi.fn();
  const onHold = vi.fn();
  const view = render(<Probe onPress={onPress} onHold={onHold} {...props} />);
  return { onPress, onHold, button: view.getByRole("button"), view };
};
const down = (el: Element, init: PointerEventInit = {}) => fireEvent.pointerDown(el, { button: 0, clientX: 5, clientY: 5, ...init });

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("usePress", () => {
  it("is a button that presses on click and announces a latch only when it has one", () => {
    const { onPress, button, view } = setup();
    expect(button.getAttribute("type")).toBe("button");
    expect(button.hasAttribute("aria-pressed")).toBe(false);
    fireEvent.click(button);
    expect(onPress).toHaveBeenCalledTimes(1);
    view.rerender(<Probe onPress={onPress} pressed />);
    expect(button.getAttribute("aria-pressed")).toBe("true");
  });

  it("holds after 450 ms, marks the hold while it builds, and swallows the click that ends it once", () => {
    const { onPress, onHold, button } = setup();
    act(() => { down(button); });
    expect(button.hasAttribute("data-holding")).toBe(true);
    act(() => vi.advanceTimersByTime(449));
    expect(onHold).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(onHold).toHaveBeenCalledTimes(1);
    expect(button.hasAttribute("data-holding")).toBe(false);
    fireEvent.pointerUp(button);
    fireEvent.click(button);
    expect(onPress).not.toHaveBeenCalled();
    fireEvent.click(button);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("lets the guard lapse when the click that ends a hold never arrives", () => {
    const { onPress, button } = setup();
    act(() => { down(button); });
    act(() => vi.advanceTimersByTime(450));
    fireEvent.pointerUp(button);
    act(() => vi.advanceTimersByTime(1000));
    fireEvent.click(button);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("cancels a hold when the pointer moves more than 10 px, and ignores other buttons", () => {
    const { onHold, button } = setup();
    act(() => { down(button); });
    fireEvent.pointerMove(button, { clientX: 30, clientY: 5 });
    act(() => { down(button, { button: 2 }); });
    act(() => vi.advanceTimersByTime(600));
    expect(onHold).not.toHaveBeenCalled();
  });

  it("keeps an unavailable control focusable: a tap does nothing, a hold still opens", () => {
    const { onPress, onHold, button } = setup({ unavailable: true });
    expect(button.getAttribute("aria-disabled")).toBe("true");
    expect(button.hasAttribute("disabled")).toBe(false);
    fireEvent.click(button);
    expect(onPress).not.toHaveBeenCalled();
    act(() => { down(button); });
    act(() => vi.advanceTimersByTime(450));
    expect(onHold).toHaveBeenCalledTimes(1);
  });

  it("does not hold when disabled", () => {
    const { onHold, button } = setup({ disabled: true });
    expect(button.hasAttribute("disabled")).toBe(true);
    act(() => { down(button); });
    act(() => vi.advanceTimersByTime(600));
    expect(onHold).not.toHaveBeenCalled();
  });
});
