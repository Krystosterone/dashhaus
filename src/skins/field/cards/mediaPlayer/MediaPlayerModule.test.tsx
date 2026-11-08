import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MediaPlayerModule } from "./MediaPlayerModule";
import { MEDIA_PLAYER_SEEDS, MEDIA_PLAYER_WORST_CASE } from "@dashhaus/core/seeds/mediaPlayer";
import type { MediaPlayerEntity } from "@dashhaus/core/entities/mediaPlayer/types";

/*
 * What every field module does, whatever it is: its keys press, a lit LED says on, and unavailable blanks the screen
 * and lays every key flat, still focusable so a hold opens the details (spec/field.md → Unavailable). The frame
 * (footprints, details) is ModuleFrame's, tested in shared/ui.test.tsx; test what this media player itself does here.
 */
const handlers = () => ({
  onPlay: vi.fn(), onPause: vi.fn(), onPrevious: vi.fn(), onNext: vi.fn(), onTurnOn: vi.fn(), onTurnOff: vi.fn(),
  onVolumeChange: vi.fn(), onMuteChange: vi.fn(), onSourceChange: vi.fn(),
});
const draw = (entity: MediaPlayerEntity, footprint?: "compact" | "standard", defaultOpen = false, quiet = false) => {
  const h = handlers();
  const { container, unmount } = render(<MediaPlayerModule entity={entity} footprint={footprint} defaultOpen={defaultOpen} quiet={quiet} {...h} />);
  const module = container.querySelector<HTMLElement>(".fd-module")!;
  return { container, module, h, unmount, keys: [...module.querySelectorAll<HTMLButtonElement>(".fd-key")] };
};
const S = MEDIA_PLAYER_SEEDS;

describe("MediaPlayerModule", () => {
  it("says PLAY, the title and the artist, lights the LED, and pauses on its first key", () => {
    const { module, keys, h } = draw(S.playing.entity);
    expect(module.querySelector(".fd-read-fig")?.textContent).toContain("PLAY");
    expect(module.querySelector(".fd-meta")?.textContent).toBe("Sunday MorningMaroon 5");
    expect(keys.map((k) => k.getAttribute("aria-label"))).toEqual(["Pause Kitchen speaker", "Kitchen speaker: next track"]);
    expect(keys[0].querySelector(".fd-led")?.getAttribute("data-lit")).toBe("true");
    fireEvent.click(keys[0]);
    fireEvent.click(keys[1]);
    expect(h.onPause).toHaveBeenCalledTimes(1);
    expect(h.onNext).toHaveBeenCalledTimes(1);
  });

  it("lights the LED while it is active (playing, buffering or on), not while it rests", () => {
    const led = (entity: MediaPlayerEntity) => draw(entity).keys[0].querySelector(".fd-led")?.getAttribute("data-lit");
    expect(led(S.on.entity)).toBe("true");
    expect(led(S.buffering.entity)).toBe("true");
    expect(led(S.paused.entity)).toBe("false");
    expect(led(S.idle.entity)).toBe("false");
  });

  it("lights the pictogram with the LED, the same active set: on with nothing loaded and buffering too (spec/cards.md)", () => {
    const lit = (entity: MediaPlayerEntity) => draw({ ...entity, picture: undefined }).module.querySelector(".fd-pict")?.getAttribute("data-lit");
    expect(lit(S.on.entity)).toBe("true");
    expect(lit(S.buffering.entity)).toBe("true");
    expect(lit(S.playing.entity)).toBe("true");
    expect(lit(S.paused.entity)).toBe("false");
    expect(lit(S.standby.entity)).toBe("false");
  });

  it("lights the volume fader only while it plays and is not muted, saying why it doesn't", () => {
    draw(S.paused.entity, "standard", true);
    const panel = screen.getByRole("dialog");
    expect(within(panel).getByText("Paused · 30%")).toBeTruthy();
    expect(panel.querySelector(".fd-fader")?.getAttribute("data-lit")).toBe("false");
    expect(within(panel).getByRole("slider", { hidden: true }).getAttribute("aria-valuetext")).toBe("30 percent, paused");
  });

  it("says Muted before the volume while muted, and lights it again only while it sounds", () => {
    draw(S.muted.entity, "standard", true);
    const panel = screen.getByRole("dialog");
    expect(within(panel).getByText(`Muted · ${S.muted.entity.volume}%`)).toBeTruthy();
    expect(panel.querySelector(".fd-fader")?.getAttribute("data-lit")).toBe("false");
  });

  it("draws no progress rule and no running clock under a quiet dashboard", () => {
    const { module } = draw(S.playing.entity, "standard", true, true);
    expect(module.querySelector(".fd-mp-prog")).toBeNull();
    const panel = screen.getByRole("dialog");
    expect(panel.querySelector(".fd-mp-clock")).toBeNull();
    expect(panel.querySelector(".fd-read-fig")?.textContent).toContain("PLAY");
  });

  it("says a hand-picked figure's core word on the meta line, and blanks what it can't name", () => {
    expect(draw(S.paused.entity).module.querySelector(".fd-meta")?.textContent).toBe("TidesPaused · Ólafur Arnalds");
    const buffering = draw(S.buffering.entity).module;
    expect(buffering.querySelector(".fd-read .fd-digits")?.getAttribute("data-pad")).toBe("----");
    expect(buffering.querySelector(".fd-meta")?.textContent).toContain("Buffering");
    const other = draw(S.other.entity).module;
    expect(other.querySelector(".fd-read .fd-digits")?.getAttribute("data-pad")).toBe("----");
    expect(other.querySelector(".fd-meta")?.textContent).toMatch(/^Connecting/);
  });

  it("turns on what is off or asleep, and lays Next flat with nothing loaded", () => {
    const { keys, h } = draw(S.off.entity);
    expect(keys[0].getAttribute("aria-label")).toBe("Turn on Office speaker");
    fireEvent.click(keys[0]);
    expect(h.onTurnOn).toHaveBeenCalledTimes(1);
    expect(keys[1].getAttribute("aria-disabled")).toBe("true");
    fireEvent.click(keys[1]);
    expect(h.onNext).not.toHaveBeenCalled();
  });

  it("draws the artwork as a window in the screen, never in a row, and a progress rule only where the track has a length", () => {
    expect(draw(S.playing.entity).module.querySelector(".fd-pic")).not.toBeNull();
    expect(draw(S.playing.entity).module.querySelector(".fd-mp-prog")).not.toBeNull();
    expect(draw(S.playing.entity, "compact").module.querySelector(".fd-pic")).toBeNull();
    const stream = draw(S.stream.entity).module;
    expect(stream.querySelector(".fd-pic")).toBeNull();
    expect(stream.querySelector(".fd-mp-prog")).toBeNull();
  });

  it("puts the title on a row's line", () => {
    expect(draw(S.playing.entity, "compact").module.textContent).toContain("Sunday Morning");
  });

  it("offers in its panel the clock, skip, volume, mute, power and the source, each where it is supported", () => {
    const { h } = draw(S.playing.entity, "standard", true);
    const panel = screen.getByRole("dialog");
    expect(within(panel).getByRole("img", { name: "1 minute 23 seconds of 4 minutes 5 seconds" })).toBeTruthy();
    fireEvent.click(within(panel).getByRole("button", { name: "Kitchen speaker: previous track" }));
    fireEvent.click(within(panel).getByRole("button", { name: "Mute" }));
    fireEvent.click(within(panel).getByRole("button", { name: "Source Radio" }));
    fireEvent.click(within(panel).getByRole("button", { name: "Power" }));
    expect(h.onPrevious).toHaveBeenCalledTimes(1);
    expect(h.onMuteChange).toHaveBeenCalledWith(true);
    expect(h.onSourceChange).toHaveBeenCalledWith("Radio");
    expect(h.onTurnOff).toHaveBeenCalledTimes(1);
    expect(within(panel).getByRole("slider", { name: "Kitchen speaker volume" })).toBeTruthy();
  });

  it("offers nothing a player doesn't support", () => {
    const bare = MEDIA_PLAYER_WORST_CASE.find((seed) => seed.entity.entityId === "media_player.wohnzimmer")!.entity;
    const { keys } = draw(bare, "standard", true);
    expect(keys).toHaveLength(1);
    expect(keys[0].getAttribute("aria-disabled")).toBe("true");
    const panel = screen.getByRole("dialog");
    expect(within(panel).queryByRole("slider")).toBeNull();
    expect(within(panel).queryByRole("button", { name: "Mute" })).toBeNull();
    expect(within(panel).getByText("View only")).toBeTruthy();
  });

  it("blanks the screen while unavailable, says when it was last seen, and lays every key flat with no state word", () => {
    const { module, keys, h } = draw(S.unavailable.entity);
    expect(module.querySelector(".fd-digits")?.getAttribute("data-pad")).toBe("----");
    expect(module.querySelector(".fd-meta")?.textContent).toBe("UnavailableLast seen 08:20");
    expect(module.querySelector(".fd-pic")).toBeNull();
    // Flat, not disabled: it keeps its focus and its hold, so the details still open; a press does nothing.
    for (const key of keys) {
      expect(key.disabled).toBe(false);
      expect(key.getAttribute("aria-disabled")).toBe("true");
      fireEvent.click(key);
    }
    for (const handler of Object.values(h)) expect(handler).not.toHaveBeenCalled();
    expect(module.querySelector(".fd-key-cap")).toBeNull();
  });

  it("starts its small print with when, Last seen while unavailable, and ends it with what it can do", () => {
    const facts = (entity: MediaPlayerEntity) => {
      const { unmount } = draw(entity, "standard", true);
      const said = [...(screen.getByRole("dialog").querySelector(".fd-info")?.children ?? [])].map((s) => s.textContent);
      unmount();
      return said;
    };
    expect(facts(S.playing.entity)).toEqual([`Last changed ${S.playing.entity.lastChanged}`, "Skip, seek, volume, mute, 3 sources"]);
    expect(facts(S.unavailable.entity)[0]).toBe("Last seen 08:20");
  });

  it("seeks from a position fader under Player, once, when let go, the legend and the screen holding the target meanwhile", () => {
    const onSeek = vi.fn(async () => true);
    render(<MediaPlayerModule entity={S.playing.entity} defaultOpen {...handlers()} onSeek={onSeek} />);
    const panel = screen.getByRole("dialog");
    const faders = [...panel.querySelectorAll<HTMLElement>(".fd-fader")];
    const position = faders[0];
    // Under Player, before the volume, in the second parameter's colour, running on by itself.
    expect(faders.map((f) => f.querySelector(".fd-legend-n")?.textContent)).toEqual(["Position", "Volume 45%"]);
    expect(position.getAttribute("data-param")).toBe("b");
    expect(position.hasAttribute("data-runs")).toBe(true);
    const input = within(panel).getByRole("slider", { name: "Kitchen speaker position", hidden: true });
    fireEvent.keyDown(input, { key: "ArrowRight" });
    fireEvent.keyDown(input, { key: "ArrowRight" });
    expect(position.hasAttribute("data-held")).toBe(true);
    expect(position.querySelector(".fd-legend-n")?.textContent).toBe("Position 1:33");
    expect(panel.querySelector(".fd-mp-clock")?.hasAttribute("data-held")).toBe(true);
    expect(onSeek).not.toHaveBeenCalled();
    fireEvent.keyUp(input, { key: "ArrowRight" });
    expect(onSeek).toHaveBeenCalledTimes(1);
    expect((onSeek.mock.calls[0] as unknown[])[0]).toBeCloseTo(93, 0);
    expect(position.querySelector(".fd-legend-n")?.textContent).toBe("Position");
  });

  it("draws no position fader for a player that can't seek, or under quiet", () => {
    const onSeek = vi.fn(async () => true);
    const fixed = render(<MediaPlayerModule entity={S.muted.entity} defaultOpen {...handlers()} onSeek={onSeek} />);
    expect(within(screen.getByRole("dialog")).queryByRole("slider", { name: "Dining room position", hidden: true })).toBeNull();
    fixed.unmount();
    render(<MediaPlayerModule entity={S.playing.entity} defaultOpen quiet {...handlers()} onSeek={onSeek} />);
    expect(within(screen.getByRole("dialog")).queryByRole("slider", { name: "Kitchen speaker position", hidden: true })).toBeNull();
  });

  it("steps the volume of a player that can't set it with a minus and a plus key, each once, flat with nothing loaded", () => {
    const onVolumeUp = vi.fn(), onVolumeDown = vi.fn();
    const tv = S.steps.entity;
    const { unmount } = render(<MediaPlayerModule entity={tv} defaultOpen {...handlers()} onVolumeUp={onVolumeUp} onVolumeDown={onVolumeDown} />);
    const panel = screen.getByRole("dialog");
    const steps = within(panel).getByRole("group", { name: "Living room TV, volume" });
    expect(steps.querySelector(".fd-steps-label b")).toBeNull();
    fireEvent.click(within(steps).getByRole("button", { name: "Living room TV: volume up" }));
    fireEvent.click(within(steps).getByRole("button", { name: "Living room TV: volume down" }));
    expect(onVolumeUp).toHaveBeenCalledTimes(1);
    expect(onVolumeDown).toHaveBeenCalledTimes(1);
    expect(within(panel).queryByRole("slider", { hidden: true })).toBeNull();
    unmount();

    render(<MediaPlayerModule entity={{ ...tv, muted: true }} defaultOpen {...handlers()} onVolumeUp={onVolumeUp} onVolumeDown={onVolumeDown} />);
    expect(screen.getByRole("dialog").querySelector(".fd-steps-label b")?.textContent).toBe("Muted");
    cleanup();

    render(<MediaPlayerModule entity={{ ...tv, state: "off" }} defaultOpen {...handlers()} onVolumeUp={onVolumeUp} onVolumeDown={onVolumeDown} />);
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Living room TV: volume up" }));
    expect(onVolumeUp).toHaveBeenCalledTimes(1);
  });

  it("leads a compact row with its key", () => {
    expect(draw(S.playing.entity, "compact").container.querySelector(".fd-module > .fd-key")).not.toBeNull();
  });
});
