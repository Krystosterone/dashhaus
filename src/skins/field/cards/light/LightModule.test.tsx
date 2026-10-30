import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LightModule } from "./LightModule";
import { SEEDS } from "./demo/useDemoLight";
import type { LightEntity } from "@scope/core/entities/light/types";

const draw = (entity: LightEntity, footprint?: "compact" | "standard") =>
  render(<LightModule entity={entity} footprint={footprint} onToggle={vi.fn()} onBrightnessChange={vi.fn()} />).container;

describe("LightModule", () => {
  it("reads a lit light's brightness with unlit leading digits, then its warmth and since when", () => {
    const el = draw(SEEDS.dimmable);
    expect(el.querySelector(".fd-read")?.textContent).toBe("80%");
    expect(el.querySelector(".fd-digits")?.getAttribute("data-pad")).toBe("0");
    expect(el.querySelector(".fd-meta")?.textContent).toBe("2700KSince 10:31");
    expect(screen.getByRole("button", { name: "Ceiling" }).getAttribute("aria-pressed")).toBe("true");
  });

  it("fills the screen's bulb with the brightness above a lit base while on, and leaves it unlit while off", () => {
    const lit = draw(SEEDS.dimmable).querySelector<HTMLElement>(".fd-pict");
    expect(lit?.dataset.lit).toBe("true");
    expect(lit?.style.getPropertyValue("--fd-level")).toBe("0.850");
    document.body.innerHTML = "";
    expect(draw(SEEDS.off).querySelector<HTMLElement>(".fd-pict")?.dataset.lit).toBe("false");
  });

  it("says OFF while off, and keeps the fader at the last level", () => {
    const el = draw(SEEDS.off);
    expect(el.querySelector(".fd-read")?.textContent).toBe("OFF");
    expect(screen.getByRole("slider").getAttribute("aria-valuetext")).toBe("Off. Last set to 70 percent");
  });

  it("gives an on/off light one wide key with its state word, and no fader", () => {
    draw(SEEDS.onOff);
    expect(screen.queryByRole("slider")).toBeNull();
    expect(screen.getByRole("button", { name: "Porch light" }).textContent).toBe("On");
  });

  it("keeps an unavailable on/off light's key wide, without a state word it doesn't know", () => {
    draw({ ...SEEDS.onOff, state: "unavailable" });
    const key = screen.getByRole("button", { name: "Porch light" });
    expect(key.hasAttribute("data-wide")).toBe(true);
    expect(key.textContent).toBe("");
  });

  it("blanks the screen, lays the key flat and drops the fader while unavailable", () => {
    const el = draw(SEEDS.unavailable);
    expect(el.querySelector(".fd-digits")?.getAttribute("data-pad")).toBe("---");
    expect(screen.getByText("Unavailable", { selector: ".fd-sr" })).toBeTruthy();
    const key = screen.getByRole("button", { name: "Shelf strip" });
    expect(key.getAttribute("aria-disabled")).toBe("true");
    expect(key.hasAttribute("data-wide")).toBe(true);
    expect(screen.queryByRole("slider", { name: "Shelf strip brightness", hidden: true })).toBeNull();
  });

  it("says ON for a dimmable light that hasn't reported its brightness", () => {
    expect(draw(SEEDS.noReading).querySelector(".fd-read")?.textContent).toBe("ON");
  });

  it("keeps the key and the screen in a compact row, without the fader", () => {
    const el = draw(SEEDS.dimmable, "compact");
    expect(el.querySelector("article")?.getAttribute("data-footprint")).toBe("compact");
    expect(screen.queryByRole("slider")).toBeNull();
    expect(el.querySelector(".fd-read")?.textContent).toBe("80%");
  });

  it("opens the detail panel from the name, with quick levels and warmth in the panel", () => {
    const onBrightnessChange = vi.fn();
    const onKelvinChange = vi.fn();
    render(<LightModule entity={SEEDS.dimmable} onToggle={vi.fn()} onBrightnessChange={onBrightnessChange} onKelvinChange={onKelvinChange} />);
    expect(screen.queryByRole("group", { name: "Quick levels" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Ceiling details" }));
    const panel = screen.getByRole("dialog", { name: "Ceiling details", hidden: true });
    fireEvent.click(within(panel).getByRole("button", { name: "Dim, 25%", hidden: true }));
    expect(onBrightnessChange).toHaveBeenCalledWith(25);
    fireEvent.change(within(panel).getByRole("slider", { name: "Ceiling warmth", hidden: true }), { target: { value: "4000" } });
    expect(onKelvinChange).toHaveBeenCalledWith(4000);
    expect(within(panel).getByText("Warm white")).toBeTruthy();
  });

  it("lays warmth flat while the light is off", () => {
    render(<LightModule entity={SEEDS.off} defaultOpen onToggle={vi.fn()} onBrightnessChange={vi.fn()} onKelvinChange={vi.fn()} />);
    expect((screen.getByRole("slider", { name: "Reading lamp warmth", hidden: true }) as HTMLInputElement).disabled).toBe(true);
  });

  it("names a colour lamp's colour on the module's screen", () => {
    expect(draw(SEEDS.colour).querySelector(".fd-meta")?.textContent).toBe("AmberSince 10:58");
  });

  it("offers a colour lamp's colours in its panel, its own latched, and sends a choice as hs_color", () => {
    const onColorChange = vi.fn();
    render(<LightModule entity={SEEDS.colour} defaultOpen onToggle={vi.fn()} onBrightnessChange={vi.fn()} onColorChange={onColorChange} />);
    const group = screen.getByRole("group", { name: "Colour", hidden: true });
    expect(within(group).getByRole("button", { name: "Amber", hidden: true }).getAttribute("aria-pressed")).toBe("true");
    expect(within(group).getByRole("button", { name: "Blue", hidden: true }).getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(within(group).getByRole("button", { name: "Blue", hidden: true }));
    expect(onColorChange).toHaveBeenCalledWith([220, 100]);
  });
});
