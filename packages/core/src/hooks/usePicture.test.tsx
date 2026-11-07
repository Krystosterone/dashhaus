import { act, render, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { usePicture } from "./usePicture";
import type { Picture, PictureOptions } from "./usePicture";

/** An off-DOM image whose decode the test settles: what `usePicture` loads each frame into. */
class FakeImage {
  static made: FakeImage[] = [];
  decoding = "";
  src = "";
  settle!: { ok: () => void; fail: () => void };
  constructor() { FakeImage.made.push(this); }
  decode() {
    return new Promise<void>((resolve, reject) => { this.settle = { ok: resolve, fail: () => reject(new Error("EncodingError")) }; });
  }
}
const last = () => FakeImage.made[FakeImage.made.length - 1];
const settle = async (ok = true) => {
  await act(async () => {
    if (ok) last().settle.ok(); else last().settle.fail();
    await Promise.resolve();
  });
};

/** An IntersectionObserver the test drives: `show(true)` puts every observed box on screen. */
class FakeObserver {
  static all: FakeObserver[] = [];
  constructor(private readonly callback: (entries: Array<{ isIntersecting: boolean }>) => void) { FakeObserver.all.push(this); }
  observe() {}
  disconnect() { FakeObserver.all = FakeObserver.all.filter((o) => o !== this); }
  static show(isIntersecting: boolean) { act(() => FakeObserver.all.forEach((o) => o.callback([{ isIntersecting }]))); }
}

const setVisibility = (state: "visible" | "hidden") => {
  Object.defineProperty(document, "visibilityState", { value: state, configurable: true });
  act(() => { document.dispatchEvent(new Event("visibilitychange")); });
};

const DOOR = "http://ha.local/api/camera_proxy/camera.door?token=a";

/** The hook with its `ref` on a box, as the skins' `Picture` part puts it: what makes it count as seen. */
function renderSeen<Props>(callback: (props: Props) => Picture, options?: { initialProps: Props }) {
  const rendered = renderHook(callback, options);
  act(() => rendered.result.current.ref(document.createElement("div")));
  return rendered;
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-07T22:00:00Z"));
  vi.stubGlobal("Image", FakeImage);
  FakeImage.made = [];
  FakeObserver.all = [];
  Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true });
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("usePicture", () => {
  it("draws a frame only once it has decoded, then holds it", async () => {
    const { result } = renderSeen(() => usePicture("/art/sunday.jpg"));
    expect(result.current).toMatchObject({ status: "loading", src: undefined });
    expect(last().decoding).toBe("async");
    expect(last().src).toBe("/art/sunday.jpg");

    await settle();
    expect(result.current).toMatchObject({ status: "ready", src: "/art/sunday.jpg", at: Date.now() });
    act(() => vi.advanceTimersByTime(60 * 60_000));
    expect(FakeImage.made).toHaveLength(1);
  });

  it("keeps the last cover up while the next track's loads, and clears it when the next one fails", async () => {
    const { result, rerender } = renderSeen(({ src }) => usePicture(src), { initialProps: { src: "/art/one.jpg" } });
    await settle();

    rerender({ src: "/art/two.jpg" });
    expect(result.current).toMatchObject({ status: "loading", src: "/art/one.jpg" });
    await settle(false);
    expect(result.current).toMatchObject({ status: "failed", src: undefined });
  });

  it("clears at once and cancels its load when the source goes, as an unavailable camera's does", async () => {
    const { result, rerender } = renderSeen(({ src }: { src?: string }) => usePicture(src), { initialProps: { src: "/art/one.jpg" as string | undefined } });
    await settle();
    rerender({ src: "/art/two.jpg" });
    const pending = last();

    rerender({ src: undefined });
    expect(result.current).toMatchObject({ status: "none", src: undefined });
    expect(pending.src).toBe("");
  });

  it("refreshes a still on its interval, each frame asked past the cache", async () => {
    const { result } = renderSeen(() => usePicture(DOOR, { refresh: 10_000 }));
    expect(last().src).toBe(`${DOOR}&t=${Date.now()}`);
    await settle();

    act(() => vi.advanceTimersByTime(9_999));
    expect(FakeImage.made).toHaveLength(1);
    act(() => vi.advanceTimersByTime(1));
    expect(FakeImage.made).toHaveLength(2);
    expect(last().src).toBe(`${DOOR}&t=${Date.now()}`);
    expect(result.current.src).toBe(FakeImage.made[0].src);

    await settle();
    expect(result.current.src).toBe(FakeImage.made[1].src);
  });

  it("keeps the last still when a refresh fails, as stale, and tries again on the interval", async () => {
    const { result } = renderSeen(() => usePicture(DOOR, { refresh: 10_000 }));
    await settle();
    const first = result.current.at;

    act(() => vi.advanceTimersByTime(10_000));
    await settle(false);
    expect(result.current).toMatchObject({ status: "stale", src: FakeImage.made[0].src, at: first });

    act(() => vi.advanceTimersByTime(10_000));
    expect(FakeImage.made).toHaveLength(3);
  });

  it("never refreshes while the page is hidden, and refreshes at once when it comes back late", async () => {
    renderSeen(() => usePicture(DOOR, { refresh: 10_000 }));
    await settle();

    setVisibility("hidden");
    act(() => vi.advanceTimersByTime(60_000));
    expect(FakeImage.made).toHaveLength(1);

    setVisibility("visible");
    act(() => vi.advanceTimersByTime(0));
    expect(FakeImage.made).toHaveLength(2);
  });

  it("loads nothing until its box is on screen, and stops refreshing once it scrolls away", async () => {
    vi.stubGlobal("IntersectionObserver", FakeObserver);
    function Still({ options }: { options: PictureOptions }) {
      const picture = usePicture<HTMLDivElement>(DOOR, options);
      return <div ref={picture.ref} data-status={picture.status} />;
    }
    const { container } = render(<Still options={{ refresh: 10_000 }} />);
    expect(FakeImage.made).toHaveLength(0);
    expect(container.firstElementChild?.getAttribute("data-status")).toBe("loading");

    FakeObserver.show(true);
    expect(FakeImage.made).toHaveLength(1);
    await settle();

    FakeObserver.show(false);
    act(() => vi.advanceTimersByTime(60_000));
    expect(FakeImage.made).toHaveLength(1);

    FakeObserver.show(true);
    act(() => vi.advanceTimersByTime(0));
    expect(FakeImage.made).toHaveLength(2);
  });

  it("never loads without a box to put on screen, even where there is no IntersectionObserver", () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    const { result } = renderHook(() => usePicture(DOOR, { refresh: 10_000 }));
    act(() => vi.advanceTimersByTime(60_000));
    expect(FakeImage.made).toHaveLength(0);
    expect(result.current).toMatchObject({ status: "loading", src: undefined });

    act(() => result.current.ref(document.createElement("div")));
    expect(FakeImage.made).toHaveLength(1);
    act(() => result.current.ref(null));
    act(() => vi.advanceTimersByTime(60_000));
    expect(FakeImage.made).toHaveLength(1);
  });

  it("paused, holds the still as stale and takes a new one only when the page wakes", async () => {
    const { result } = renderSeen(() => usePicture(DOOR, { refresh: 10_000, paused: true }));
    await settle();
    expect(result.current.status).toBe("stale");

    act(() => vi.advanceTimersByTime(10 * 60_000));
    expect(FakeImage.made).toHaveLength(1);

    setVisibility("hidden");
    setVisibility("visible");
    expect(FakeImage.made).toHaveLength(2);
    await settle();
    expect(result.current).toMatchObject({ status: "stale", src: FakeImage.made[1].src });
  });

  it("waits for a load event where decode isn't there", async () => {
    class OldImage {
      src = "";
      decoding = "";
      onload?: () => void;
      onerror?: () => void;
    }
    const made: OldImage[] = [];
    vi.stubGlobal("Image", class extends OldImage { constructor() { super(); made.push(this); } });
    const { result } = renderSeen(() => usePicture("/art/sunday.jpg"));

    await act(async () => { made[0]?.onload?.(); await Promise.resolve(); });
    expect(result.current).toMatchObject({ status: "ready", src: "/art/sunday.jpg" });
  });
});
