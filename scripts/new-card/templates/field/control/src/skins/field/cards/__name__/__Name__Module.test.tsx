import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { __Name__Module } from "./__Name__Module";
import { __CONST___SEEDS } from "./demo/__seedFile__";

const draw = (seed: keyof typeof __CONST___SEEDS, footprint?: "compact" | "standard") => {
  const onToggle = vi.fn();
  const { container } = render(<__Name__Module entity={__CONST___SEEDS[seed].entity} footprint={footprint} onToggle={onToggle} />);
  return { container, onToggle, key: container.querySelector<HTMLButtonElement>(".fd-key")! };
};

describe("__Name__Module", () => {
  it("switches the __label__ from its key, whose LED says whether it's on", () => {
    const { key, onToggle } = draw("__firstSeed__");
    expect(key.getAttribute("aria-pressed")).toBe(String(__CONST___SEEDS.__firstSeed__.entity.state === "on"));
    fireEvent.click(key);
    expect(onToggle).toHaveBeenCalledOnce();
  });

  it("blanks the screen and lays the key flat while unavailable", () => {
    const { container, key } = draw("__unavailableSeed__");
    expect(container.querySelector(".fd-digits")?.getAttribute("data-pad")).toBe("---");
    expect(key.disabled).toBe(true);
  });

  it("keeps the key and the screen in a compact row", () => {
    const { container } = draw("__firstSeed__", "compact");
    expect(container.querySelector(".fd-module")?.getAttribute("data-footprint")).toBe("compact");
    expect(container.querySelector(".fd-screen")).not.toBeNull();
  });

  it("opens the panel from the name", () => {
    draw("__firstSeed__");
    fireEvent.click(screen.getByRole("button", { name: /details$/ }));
    expect(screen.getByRole("dialog")).toBeTruthy();
  });
});
