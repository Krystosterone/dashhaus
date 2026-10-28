import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { __Name__Module } from "./__Name__Module";
import { __CONST___SEEDS } from "./demo/__seedFile__";

const draw = (seed: keyof typeof __CONST___SEEDS, footprint?: "compact" | "standard") =>
  render(<__Name__Module entity={__CONST___SEEDS[seed].entity} footprint={footprint} />).container;

describe("__Name__Module", () => {
  it("is a reading: nothing to press but its name, its glyph flat where a key would be", () => {
    const el = draw("__firstSeed__");
    expect(screen.getAllByRole("button").map((b) => b.getAttribute("aria-label"))).toEqual([`${__CONST___SEEDS.__firstSeed__.entity.name} details`]);
    expect(el.querySelector(".fd-glyph")).not.toBeNull();
  });

  it("blanks the screen while unavailable, with when it was last seen", () => {
    const el = draw("__unavailableSeed__");
    expect(el.querySelector(".fd-digits")?.getAttribute("data-pad")).toBe("---");
    expect(el.querySelector(".fd-meta")?.textContent).toMatch(/^Unavailable/);
  });

  it("keeps the glyph and the screen in a compact row", () => {
    const el = draw("__firstSeed__", "compact");
    expect(el.querySelector(".fd-module")?.getAttribute("data-footprint")).toBe("compact");
    expect(el.querySelector(".fd-glyph")).not.toBeNull();
  });

  it("opens the panel from the name", () => {
    draw("__firstSeed__");
    fireEvent.click(screen.getByRole("button", { name: /details$/ }));
    expect(screen.getByRole("dialog")).toBeTruthy();
  });
});
