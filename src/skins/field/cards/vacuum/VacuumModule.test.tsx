import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { VacuumModule } from "./VacuumModule";
import { VACUUM_SEEDS } from "@dashhaus/core/seeds/vacuum";
import type { VacuumEntity } from "@dashhaus/core/entities/vacuum/types";

/*
 * What every field module does, whatever it is: its keys press, a lit LED says on, and unavailable blanks the screen
 * and lays every key flat, still focusable so a hold opens the details (spec/field.md → Unavailable). The frame
 * (footprints, details) is ModuleFrame's, tested in shared/ui.test.tsx; this tests what the vacuum itself does.
 */
const handlers = () => ({ onStart: vi.fn(), onPause: vi.fn(), onReturnToBase: vi.fn(), onLocate: vi.fn(), onFanSpeedChange: vi.fn() });
const draw = (entity: VacuumEntity | keyof typeof VACUUM_SEEDS, footprint?: "compact" | "standard") => {
  const h = handlers();
  const { container } = render(<VacuumModule entity={typeof entity === "string" ? VACUUM_SEEDS[entity].entity : entity} footprint={footprint} {...h} />);
  return { container, handlers: h, keys: [...container.querySelectorAll<HTMLButtonElement>(".fd-module .fd-key")] };
};

describe("VacuumModule", () => {
  it("pauses a vacuum that cleans, its LED lit, and sends it home from Return", () => {
    const { container, keys, handlers: h } = draw("cleaning");
    expect(container.querySelector(".fd-read")?.textContent).toContain("RUN");
    expect(keys.map((k) => k.textContent)).toEqual(["Pause", "Return"]);
    expect(keys[0].querySelector(".fd-led")?.getAttribute("data-lit")).toBe("true");
    for (const key of keys) fireEvent.click(key);
    expect(h.onPause).toHaveBeenCalledOnce();
    expect(h.onReturnToBase).toHaveBeenCalledOnce();
    expect(h.onStart).not.toHaveBeenCalled();
  });

  it("starts one that stands, and resumes a paused one; Return lies flat on the dock", () => {
    const docked = draw("docked");
    expect(docked.keys.map((k) => k.textContent)).toEqual(["Start", "Return"]);
    for (const key of docked.keys) fireEvent.click(key);
    expect(docked.handlers.onStart).toHaveBeenCalledOnce();
    expect(docked.handlers.onReturnToBase).not.toHaveBeenCalled();
    expect(draw("paused").keys[0].textContent).toBe("Resume");
  });

  it("puts an error in an inverted block with what went wrong, and starts it again", () => {
    const { container, keys } = draw("error");
    expect(container.querySelector(".fd-meta .fd-warn[data-block]")?.textContent).toContain("Error");
    expect(container.querySelector(".fd-meta")?.textContent).toContain("Main brush jammed");
    expect(keys[0].textContent).toBe("Start again");
  });

  it("warns of a low battery on the plate, away from the dock", () => {
    expect(draw("lowBattery").container.querySelector(".fd-module")?.textContent).toContain("Battery 9%");
    expect(draw({ ...VACUUM_SEEDS.lowBattery.entity, state: "docked" }).container.querySelector(".fd-module")?.textContent).not.toContain("Battery 9%");
  });

  it("says an integration's own state in its words, with blank segments", () => {
    const { container } = draw("other");
    expect(container.querySelector(".fd-digits")?.getAttribute("data-pad")).toBe("----");
    expect(container.querySelector(".fd-meta")?.textContent).toMatch(/^Emptying the bin/);
  });

  it("blanks the screen while unavailable, says when it was last seen, and lays every key flat with no state word", () => {
    const { container, keys, handlers: h } = draw("unavailable");
    expect(container.querySelector(".fd-digits")?.getAttribute("data-pad")).toBe("----");
    expect(container.querySelector(".fd-meta")?.textContent).toMatch(/^Unavailable/);
    for (const key of keys) {
      expect(key.disabled).toBe(false);
      expect(key.getAttribute("aria-disabled")).toBe("true");
      fireEvent.click(key);
    }
    for (const handler of Object.values(h)) expect(handler).not.toHaveBeenCalled();
    expect(container.querySelector(".fd-key-cap")).toBeNull();
  });

  it("offers Locate and the fan speeds in the panel", () => {
    const h = handlers();
    render(<VacuumModule entity={VACUUM_SEEDS.cleaning.entity} {...h} defaultOpen />);
    fireEvent.click(screen.getByRole("button", { name: "Locate Robot vacuum: it plays a sound" }));
    fireEvent.click(screen.getByRole("button", { name: "Fan speed Turbo" }));
    expect(h.onLocate).toHaveBeenCalledOnce();
    expect(h.onFanSpeedChange).toHaveBeenCalledWith("turbo");
  });

  it("leads a compact row with its key", () => {
    expect(draw("cleaning", "compact").container.querySelector(".fd-module > .fd-key")).not.toBeNull();
  });
});
