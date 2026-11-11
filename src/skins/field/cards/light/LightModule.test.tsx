import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LightModule } from "./LightModule";
import { LIGHT_SEEDS } from "@dashhaus/core/seeds/light";
import type { LightEntity } from "@dashhaus/core/entities/light/types";

const draw = (entity: LightEntity, footprint?: "compact" | "standard") =>
  render(<LightModule entity={entity} footprint={footprint} onToggle={vi.fn()} onBrightnessChange={vi.fn()} />).container;

describe("LightModule", () => {
  it("reads a lit light's brightness with unlit leading digits, then its warmth and since when", () => {
    const el = draw(LIGHT_SEEDS.dimmable.entity);
    expect(el.querySelector(".fd-read")?.textContent).toBe("80%");
    expect(el.querySelector(".fd-digits")?.getAttribute("data-pad")).toBe("0");
    // spec/cards.md → Field's meta line still says the core word: the warmth's name, as orb's status line says it.
    expect(el.querySelector(".fd-meta .fd-lt-wn")?.textContent).toBe("Warm white");
    // A narrow module's screen shortens it to the figure (LightModule.css).
    expect(el.querySelector(".fd-meta .fd-lt-wk")?.textContent).toBe("2700K");
    expect(el.querySelector(".fd-meta-2")?.textContent).toBe("Since 10:31");
    expect(screen.getByRole("button", { name: "Ceiling" }).getAttribute("aria-pressed")).toBe("true");
  });

  it("fills the screen's bulb with the brightness above a lit base while on, and leaves it unlit while off", () => {
    const lit = draw(LIGHT_SEEDS.dimmable.entity).querySelector<HTMLElement>(".fd-pict");
    expect(lit?.dataset.lit).toBe("true");
    expect(lit?.style.getPropertyValue("--fd-level")).toBe("0.850");
    document.body.innerHTML = "";
    expect(draw(LIGHT_SEEDS.dimmableOff.entity).querySelector<HTMLElement>(".fd-pict")?.dataset.lit).toBe("false");
  });

  it("says OFF while off, keeping the fader but no level Home Assistant didn't report", () => {
    const el = draw(LIGHT_SEEDS.dimmableOff.entity);
    expect(el.querySelector(".fd-read")?.textContent).toBe("OFF");
    expect(screen.getByRole("slider").getAttribute("aria-valuetext")).toBe("Off");
    // No thumb: any place would claim a level Home Assistant never reported.
    expect(el.querySelector(".fd-thumb")).toBeNull();
    document.body.innerHTML = "";
    const known = draw({ ...LIGHT_SEEDS.dimmableOff.entity, brightness: 70 });
    expect(screen.getByRole("slider").getAttribute("aria-valuetext")).toBe("Off. Last set to 70 percent");
    expect(known.querySelector(".fd-thumb")).not.toBeNull();
  });

  it("draws an unknown light as drivable: blank segments and Unknown, a live key and fader", () => {
    const onToggle = vi.fn();
    const onBrightnessChange = vi.fn();
    const { container } = render(<LightModule entity={LIGHT_SEEDS.unknown.entity} onToggle={onToggle} onBrightnessChange={onBrightnessChange} />);
    expect(container.querySelector(".fd-read")?.textContent).toBe("Unknown");
    expect(container.querySelector(".fd-meta")?.textContent).toContain("Unknown");
    const key = screen.getByRole("button", { name: "String lights" });
    expect(key.getAttribute("aria-disabled")).toBeNull();
    expect(key.getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(key);
    expect(onToggle).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("slider").getAttribute("aria-valuetext")).toBe("Unknown");
    // Empty, it still takes a slide, which turns the light on there.
    fireEvent.change(screen.getByRole("slider"), { target: { value: "40" } });
    expect(onBrightnessChange).toHaveBeenCalledWith(40);
  });

  it("gives an on/off light one wide key with its state word, and no fader", () => {
    draw(LIGHT_SEEDS.onOff.entity);
    expect(screen.queryByRole("slider")).toBeNull();
    expect(screen.getByRole("button", { name: "Porch light" }).textContent).toBe("On");
  });

  it("keeps an unavailable on/off light's key wide, without a state word it doesn't know", () => {
    draw({ ...LIGHT_SEEDS.onOff.entity, state: "unavailable" });
    const key = screen.getByRole("button", { name: "Porch light" });
    expect(key.hasAttribute("data-wide")).toBe(true);
    expect(key.textContent).toBe("");
  });

  it("blanks the screen, lays the key flat and drops the fader while unavailable", () => {
    const el = draw(LIGHT_SEEDS.unavailable.entity);
    expect(el.querySelector(".fd-digits")?.getAttribute("data-pad")).toBe("---");
    expect(screen.getByText("Unavailable", { selector: ".fd-sr" })).toBeTruthy();
    const key = screen.getByRole("button", { name: "Shelf strip" });
    expect(key.getAttribute("aria-disabled")).toBe("true");
    expect(key.hasAttribute("data-wide")).toBe(true);
    expect(screen.queryByRole("slider", { name: "Shelf strip brightness", hidden: true })).toBeNull();
  });

  it("says ON for a dimmable light that hasn't reported its brightness", () => {
    expect(draw(LIGHT_SEEDS.noReading.entity).querySelector(".fd-read")?.textContent).toBe("ON");
  });

  it("keeps the key and the screen in a compact row, without the fader", () => {
    const el = draw(LIGHT_SEEDS.dimmable.entity, "compact");
    expect(el.querySelector("article")?.getAttribute("data-footprint")).toBe("compact");
    expect(screen.queryByRole("slider")).toBeNull();
    expect(el.querySelector(".fd-read")?.textContent).toBe("80%");
  });

  it("opens the detail panel from the name, with quick levels and warmth in the panel", () => {
    const onBrightnessChange = vi.fn();
    const onKelvinChange = vi.fn();
    render(<LightModule entity={LIGHT_SEEDS.dimmable.entity} onToggle={vi.fn()} onBrightnessChange={onBrightnessChange} onKelvinChange={onKelvinChange} />);
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
    render(<LightModule entity={LIGHT_SEEDS.dimmableOff.entity} defaultOpen onToggle={vi.fn()} onBrightnessChange={vi.fn()} onKelvinChange={vi.fn()} />);
    expect((screen.getByRole("slider", { name: "Reading lamp warmth", hidden: true }) as HTMLInputElement).disabled).toBe(true);
  });

  it("names a colour lamp's colour on the module's screen", () => {
    expect(draw(LIGHT_SEEDS.nightLight.entity).querySelector(".fd-meta")?.textContent).toBe("AmberSince 10:58");
  });

  it("offers a colour lamp's colours in its panel, its own latched, and sends a choice as hs_color", () => {
    const onColorChange = vi.fn();
    render(<LightModule entity={LIGHT_SEEDS.nightLight.entity} defaultOpen onToggle={vi.fn()} onBrightnessChange={vi.fn()} onColorChange={onColorChange} />);
    const group = screen.getByRole("group", { name: "Colour", hidden: true });
    expect(within(group).getByRole("button", { name: "Amber", hidden: true }).getAttribute("aria-pressed")).toBe("true");
    expect(within(group).getByRole("button", { name: "Blue", hidden: true }).getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(within(group).getByRole("button", { name: "Blue", hidden: true }));
    expect(onColorChange).toHaveBeenCalledWith([220, 100]);
  });

  it("offers on and off apart in the panel while its state is assumed", () => {
    const onTurnOn = vi.fn();
    render(<LightModule entity={LIGHT_SEEDS.assumed.entity} onToggle={vi.fn()} onBrightnessChange={vi.fn()} onTurnOn={onTurnOn} onTurnOff={vi.fn()} defaultOpen />);
    fireEvent.click(screen.getByRole("button", { name: "Porch lantern, turn on" }));
    expect(onTurnOn).toHaveBeenCalledOnce();
  });
});
