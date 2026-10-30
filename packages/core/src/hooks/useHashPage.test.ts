import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { pageFromHash, useHashPage } from "./useHashPage";

const PAGES = ["home", "living", "nursery"];

afterEach(() => history.replaceState(null, "", "/"));

describe("pageFromHash", () => {
  it("reads the page from the hash, and falls back to the main page", () => {
    expect(pageFromHash("#page=living", PAGES, "home")).toBe("living");
    expect(pageFromHash("#x=1&page=nursery", PAGES, "home")).toBe("nursery");
    expect(pageFromHash("", PAGES, "home")).toBe("home");
    expect(pageFromHash("#page=attic", PAGES, "home")).toBe("home");
  });
});

describe("useHashPage", () => {
  it("opens a page with a history entry, and the main page without a hash", () => {
    const { result } = renderHook(() => useHashPage(PAGES, "home"));
    expect(result.current[0]).toBe("home");

    act(() => result.current[1]("living"));
    expect(result.current[0]).toBe("living");
    expect(location.hash).toBe("#page=living");

    act(() => result.current[1]("home"));
    expect(result.current[0]).toBe("home");
    expect(location.hash).toBe("");
  });

  it("follows back and forward", () => {
    const { result } = renderHook(() => useHashPage(PAGES, "home"));
    act(() => result.current[1]("nursery"));
    act(() => {
      history.replaceState(null, "", "/#page=living");
      dispatchEvent(new PopStateEvent("popstate"));
    });
    expect(result.current[0]).toBe("living");
  });

  it("starts on the page a link names", () => {
    history.replaceState(null, "", "/#page=nursery");
    const { result } = renderHook(() => useHashPage(PAGES, "home"));
    expect(result.current[0]).toBe("nursery");
  });
});
