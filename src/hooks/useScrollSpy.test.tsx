import { act, render } from "@testing-library/react";
import { useRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useScrollSpy } from "./useScrollSpy";

/** Section tops, as the next measure reads them; the viewport is 800 px tall, so the reading line is at 280. */
let tops: Record<string, number> = {};
let rootBox = { top: 0, bottom: 2000 };

function Page({ onJump }: { onJump?: (jump: (id: string) => void) => void }) {
  const root = useRef<HTMLDivElement>(null);
  const [active, jump] = useScrollSpy(root);
  onJump?.(jump);
  return (
    <div ref={root} data-testid="root">
      <output data-testid="active">{active}</output>
      {["a", "b", "c"].map((id) => <section key={id} data-section-id={id} />)}
    </div>
  );
}

const scroll = () => act(() => {
  document.dispatchEvent(new Event("scroll"));
  vi.runOnlyPendingTimers();
});

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["requestAnimationFrame", "cancelAnimationFrame", "performance"] });
  Object.defineProperty(window, "innerHeight", { value: 800, configurable: true });
  Element.prototype.scrollIntoView = vi.fn();
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (this: Element) {
    const id = (this as HTMLElement).dataset?.sectionId;
    const box = id != null ? { top: tops[id], bottom: tops[id] + 300 } : (this as HTMLElement).dataset?.testid === "root" ? rootBox : { top: 0, bottom: 0 };
    return { ...box, left: 0, right: 0, width: 0, height: box.bottom - box.top, x: 0, y: box.top, toJSON: () => ({}) } as DOMRect;
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("useScrollSpy", () => {
  it("marks the last section whose top has passed the reading line", () => {
    tops = { a: 100, b: 500, c: 900 };
    const { getByTestId } = render(<Page />);
    expect(getByTestId("active").textContent).toBe("a");

    tops = { a: -300, b: 200, c: 600 };
    scroll();
    expect(getByTestId("active").textContent).toBe("b");
  });

  it("marks the last section at the end of the page, even when it can't reach the line", () => {
    tops = { a: -900, b: -500, c: 400 };
    rootBox = { top: -1200, bottom: 790 };
    const { getByTestId } = render(<Page />);
    expect(getByTestId("active").textContent).toBe("c");
    rootBox = { top: 0, bottom: 2000 };
  });

  it("jumps to a section, marks it at once, and holds it while the scroll settles", () => {
    tops = { a: 100, b: 500, c: 900 };
    let jump: (id: string) => void = () => {};
    const { getByTestId, container } = render(<Page onJump={(j) => { jump = j; }} />);

    act(() => jump("c"));
    expect(getByTestId("active").textContent).toBe("c");
    expect(container.querySelector("[data-section-id=c]")!.scrollIntoView).toHaveBeenCalled();

    tops = { a: -100, b: 250, c: 650 }; // mid-scroll, passing b
    scroll();
    expect(getByTestId("active").textContent).toBe("c");
  });
});
