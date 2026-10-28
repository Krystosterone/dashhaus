import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ToggleModule } from "./ToggleModule";
import { TOGGLE_SEEDS, TOGGLE_WORST_CASE } from "./demo/useDemoToggle";
import type { ToggleSeed } from "./demo/useDemoToggle";

const draw = ({ entity }: ToggleSeed, footprint?: "compact" | "standard") => {
  const onToggle = vi.fn();
  const { container } = render(<ToggleModule entity={entity} footprint={footprint} onToggle={onToggle} />);
  return { container, onToggle, keys: [...container.querySelectorAll<HTMLButtonElement>(".fd-key")] };
};

describe("ToggleModule", () => {
  it("presses its key once, and lights its LED while it's on", () => {
    const { container, keys, onToggle } = draw(TOGGLE_SEEDS.dnd);
    expect(keys).toHaveLength(1);
    expect(keys[0].getAttribute("aria-pressed")).toBe("true");
    expect(container.querySelector(".fd-led")?.getAttribute("data-lit")).toBe("true");
    fireEvent.click(keys[0]);
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it("says ON with until when on the screen, and since when beside it", () => {
    const { container } = draw(TOGGLE_SEEDS.dnd);
    expect(container.querySelector(".fd-read")?.textContent).toBe("ON");
    expect(container.querySelector(".fd-meta")?.textContent).toBe("Until 12:54Since 11:02");
    expect(screen.getByRole("button", { name: "Do Not Disturb" }).textContent).toBe("On");
  });

  it("says OFF and since when while off, its pictogram unlit", () => {
    const { container } = draw(TOGGLE_SEEDS.quiet);
    expect(container.querySelector(".fd-read")?.textContent).toBe("OFF");
    expect(container.querySelector(".fd-meta")?.textContent).toBe("Since 07:15");
    expect(container.querySelector<HTMLElement>(".fd-pict")?.dataset.lit).toBe("false");
  });

  it("lights its pictogram in the figure's ink, never a parameter's colour", () => {
    const pict = draw(TOGGLE_SEEDS.guest).container.querySelector<HTMLElement>(".fd-pict");
    expect(pict?.dataset.param).toBe("neutral");
    expect(pict?.dataset.lit).toBe("true");
  });

  it("blanks the screen while unavailable, says when it was last seen, and lays its key flat without a state word", () => {
    const { container, keys } = draw(TOGGLE_SEEDS.unavailable);
    expect(container.querySelector(".fd-digits")?.getAttribute("data-pad")).toBe("---");
    expect(container.querySelector(".fd-meta")?.textContent).toBe("UnavailableSeen 08:20");
    expect(keys.every((key) => key.disabled)).toBe(true);
    expect(container.querySelector(".fd-key-cap")).toBeNull();
  });

  it("leads a compact row with its square key, and keeps the screen", () => {
    const { container } = draw(TOGGLE_SEEDS.dnd, "compact");
    const key = container.querySelector(".fd-module > .fd-key");
    expect(key).not.toBeNull();
    expect(key?.hasAttribute("data-wide")).toBe(false);
    expect(container.querySelector(".fd-read")?.textContent).toBe("ON");
  });

  it("draws a mode with no icon or area", () => {
    const { container } = draw(TOGGLE_WORST_CASE[2]);
    expect(container.querySelector(".fd-area")).toBeNull();
    expect(container.querySelector(".fd-pict svg path")).not.toBeNull();
  });

  it("opens the panel from the name: what it does, when it turns off, and the duration it was turned on with", () => {
    const onTurnOnFor = vi.fn();
    render(<ToggleModule entity={TOGGLE_SEEDS.dnd.entity} onToggle={vi.fn()} onTurnOnFor={onTurnOnFor} />);
    fireEvent.click(screen.getByRole("button", { name: "Do Not Disturb details" }));
    const panel = screen.getByRole("dialog", { name: "Do Not Disturb details", hidden: true });
    expect(within(panel).getByText(/Silences phone notifications/)).toBeTruthy();
    expect(panel.querySelector(".fd-chan")?.textContent).toBe("12:54Turns off");
    const group = within(panel).getByRole("group", { name: "Keep on", hidden: true });
    expect(within(group).getByRole("button", { name: "1 hour", hidden: true }).getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(within(group).getByRole("button", { name: "Morning, 07:00", hidden: true }));
    expect(onTurnOnFor).toHaveBeenCalledWith("morning");
  });

  it("offers ways to turn it on while off, none chosen, and none without onTurnOnFor", () => {
    const { unmount } = render(<ToggleModule entity={TOGGLE_SEEDS.quiet.entity} defaultOpen onToggle={vi.fn()} onTurnOnFor={vi.fn()} />);
    const group = screen.getByRole("group", { name: "Turn on for", hidden: true });
    expect(within(group).getAllByRole("button", { hidden: true }).map((b) => b.getAttribute("aria-pressed"))).toEqual(["false", "false", "false", "false"]);
    unmount();
    render(<ToggleModule entity={TOGGLE_SEEDS.quiet.entity} defaultOpen onToggle={vi.fn()} />);
    expect(screen.queryByRole("group", { hidden: true })).toBeNull();
  });

  it("lays the panel's keys flat while unavailable", () => {
    render(<ToggleModule entity={TOGGLE_SEEDS.unavailable.entity} defaultOpen onToggle={vi.fn()} onTurnOnFor={vi.fn()} />);
    const panel = screen.getByRole("dialog", { hidden: true });
    expect(within(panel).getAllByRole("button", { hidden: true }).filter((b) => !b.getAttribute("aria-label")?.startsWith("Close")).every((b) => (b as HTMLButtonElement).disabled)).toBe(true);
  });
});
