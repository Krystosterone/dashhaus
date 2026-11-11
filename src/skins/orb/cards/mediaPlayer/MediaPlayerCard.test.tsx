import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MediaPlayerCard } from "./MediaPlayerCard";
import { MEDIA_PLAYER_SEEDS } from "@dashhaus/core/seeds/mediaPlayer";
import type { MediaPlayerEntity } from "@dashhaus/core/entities/mediaPlayer/types";

const playing: MediaPlayerEntity = MEDIA_PLAYER_SEEDS.playing.entity;
const press = () => ({ onPlay: vi.fn(), onPause: vi.fn(), onTurnOn: vi.fn() });

/** The status line as a card 260 px and wider shows it, where the pill says the state itself: without `hd-said`. */
const statusLine = (container: HTMLElement) => {
  const line = container.querySelector(".hd-area")?.cloneNode(true) as HTMLElement | undefined;
  line?.querySelectorAll(".hd-said").forEach((said) => said.remove());
  return line?.textContent;
};

describe("MediaPlayerCard", () => {
  it("is a state: the accent while playing, never a glow", () => {
    const { container } = render(<MediaPlayerCard entity={playing} {...press()} />);
    const card = container.querySelector("article");
    expect(card?.getAttribute("data-role")).toBe("state");
    expect(card?.getAttribute("data-glow")).toBeNull();
    expect(card?.className).toBe("hd mp");
    expect(screen.getByRole("button", { name: /^Kitchen speaker: Playing · Pause/ }).getAttribute("aria-pressed")).toBe("true");
  });

  it("is the accent while on with nothing to play (a TV showing an input), as a light that is on", () => {
    const { container } = render(<MediaPlayerCard entity={MEDIA_PLAYER_SEEDS.on.entity} {...press()} onTurnOff={vi.fn()} />);
    expect(screen.getByRole("button", { name: /^Den TV: On · Turn off/ }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: "Turn off Den TV" }).getAttribute("aria-pressed")).toBe("true");
    expect(container.querySelector("article")?.getAttribute("data-state")).toBe("on");
  });

  it("rests while paused: the pill is raised, not the accent", () => {
    render(<MediaPlayerCard entity={MEDIA_PLAYER_SEEDS.paused.entity} {...press()} />);
    expect(screen.getByRole("button", { name: /^Living room: Paused · Play/ }).getAttribute("aria-pressed")).toBe("false");
  });

  it("says since when, not the slot's word again, where it has nothing else to say", () => {
    const bare: MediaPlayerEntity = { entityId: "media_player.x", name: "X", state: "playing", lastChanged: "11:40" };
    const { container } = render(<MediaPlayerCard entity={bare} {...press()} />);
    expect(statusLine(container)).toBe("Since 11:40");
  });

  it("keeps what a press does whole, and under 260 px says the state it drops on the status line instead", () => {
    const { container } = render(<MediaPlayerCard entity={playing} {...press()} />);
    expect(container.querySelector(".hd-pill > .hd-pill-w")?.textContent).toBe("Playing");
    expect(container.querySelector(".hd-pill > [data-action]")?.textContent).toBe("Pause");
    expect(container.querySelector(".hd-area")?.textContent).toBe("Playing · Sunday Morning · Maroon 5");
    expect(statusLine(container)).toBe("Sunday Morning · Maroon 5");
  });

  it("has no state to give the status line where the slot says it with nothing to press", () => {
    const { container } = render(<MediaPlayerCard entity={playing} />);
    expect(container.querySelector(".hd-said")).toBeNull();
    expect(container.querySelector(".hd-st")?.textContent).toBe("Playing");
  });

  it("falls back on its status line as every card does: its own cue, the area, since when, then nothing (spec/orb.md)", () => {
    const status = (entity: MediaPlayerEntity) => {
      const { container, unmount } = render(<MediaPlayerCard entity={entity} {...press()} />);
      const said = statusLine(container) ?? "";
      unmount();
      return said;
    };
    const idle: MediaPlayerEntity = { entityId: "media_player.x", name: "X", state: "idle", area: "Den", lastChanged: "11:40" };
    expect(status({ ...idle, title: "Tides" })).toBe("Tides");
    expect(status(idle)).toBe("Den");
    expect(status({ ...idle, area: undefined })).toBe("Since 11:40");
    expect(status({ ...idle, area: undefined, lastChanged: undefined })).toBe("");
  });

  it("says what is playing on the status line, the title first", () => {
    const { container } = render(<MediaPlayerCard entity={playing} {...press()} />);
    expect(statusLine(container)).toBe("Sunday Morning · Maroon 5");
  });

  it("pauses what plays, plays what doesn't, and turns on what is off, from the orb and the pill", () => {
    const h = press();
    const { rerender } = render(<MediaPlayerCard entity={playing} {...h} />);
    fireEvent.click(screen.getByRole("button", { name: "Pause Kitchen speaker" }));
    fireEvent.click(screen.getByRole("button", { name: /^Kitchen speaker: Playing · Pause/ }));
    expect(h.onPause).toHaveBeenCalledTimes(2);
    rerender(<MediaPlayerCard entity={{ ...playing, state: "paused" }} {...h} />);
    fireEvent.click(screen.getByRole("button", { name: /^Kitchen speaker: Paused · Play/ }));
    expect(h.onPlay).toHaveBeenCalledTimes(1);
    rerender(<MediaPlayerCard entity={{ ...playing, state: "standby" }} {...h} />);
    fireEvent.click(screen.getByRole("button", { name: "Turn on Kitchen speaker" }));
    expect(h.onTurnOn).toHaveBeenCalledTimes(1);
  });

  it("shows its state with nothing to press where it can't do the press", () => {
    const { container } = render(<MediaPlayerCard entity={{ ...playing, supportsPause: false, supportsTurnOff: false }} {...press()} />);
    expect(container.querySelector(".mp-st")?.textContent).toBe("Playing");
  });

  it("says Muted after what is playing", () => {
    const { container } = render(<MediaPlayerCard entity={{ ...playing, muted: true }} {...press()} />);
    expect(statusLine(container)).toBe("Sunday Morning · Maroon 5 · Muted");
  });

  it("draws the artwork and how far in when featured, and neither on a standard card", () => {
    const { container, rerender } = render(<MediaPlayerCard entity={playing} {...press()} />);
    expect(container.querySelector(".hd-pic")).toBeNull();
    expect(container.querySelector(".mp-prog")).toBeNull();
    rerender(<MediaPlayerCard entity={playing} footprint="featured" {...press()} />);
    expect(screen.getByRole("img", { name: "Artwork for Sunday Morning" })).toBeTruthy();
    expect(screen.getByRole("img", { name: "1 minute 23 seconds of 4 minutes 5 seconds" })).toBeTruthy();
    expect(statusLine(container)).toBe("Kitchen · Spotify");
  });

  it("draws no progress line and no clock under a quiet dashboard", () => {
    const { container } = render(<MediaPlayerCard entity={playing} footprint="featured" quiet {...press()} />);
    expect(container.querySelector(".mp-title")?.textContent).toBe("Sunday Morning");
    expect(container.querySelector(".mp-prog")).toBeNull();
  });

  it("fills the volume groove only while it plays and is not muted, saying why it doesn't", () => {
    const sheet = (entity: MediaPlayerEntity) => render(<MediaPlayerCard entity={entity} variant="sheet" {...press()} onVolumeChange={vi.fn()} />);
    const { unmount } = sheet(MEDIA_PLAYER_SEEDS.paused.entity);
    expect(screen.getAllByText("Paused · 30%").length).toBeGreaterThan(0);
    expect(screen.getByRole("slider").getAttribute("aria-valuetext")).toBe("30 percent, paused");
    unmount();
    const muted = sheet(MEDIA_PLAYER_SEEDS.muted.entity);
    expect(screen.getAllByText("Muted · 60%").length).toBeGreaterThan(0);
    muted.unmount();
    sheet(playing);
    expect(screen.getByRole("slider").getAttribute("aria-valuetext")).toBe("45 percent");
  });

  it("draws no progress for a stream with no duration, and no well without artwork", () => {
    const { container } = render(<MediaPlayerCard entity={MEDIA_PLAYER_SEEDS.stream.entity} footprint="featured" {...press()} />);
    expect(container.querySelector(".mp-title")?.textContent).toBe("BBC Radio 6 Music");
    expect(container.querySelector(".mp-prog")).toBeNull();
    expect(container.querySelector(".hd-pic")).toBeNull();
  });

  it("offers skip, volume, sound, source and turning off in the sheet, each where it is supported", () => {
    const h = { ...press(), onPrevious: vi.fn(), onNext: vi.fn(), onTurnOff: vi.fn(), onVolumeChange: vi.fn(), onMuteChange: vi.fn(), onSourceChange: vi.fn() };
    render(<MediaPlayerCard entity={playing} variant="sheet" {...h} />);
    fireEvent.click(screen.getByRole("button", { name: "Kitchen speaker: next track" }));
    fireEvent.click(screen.getByRole("button", { name: "Kitchen speaker: previous track" }));
    fireEvent.click(screen.getByRole("button", { name: "On" }));
    fireEvent.click(screen.getByRole("button", { name: "Radio" }));
    fireEvent.click(screen.getByRole("button", { name: "Turn Kitchen speaker off" }));
    expect(h.onNext).toHaveBeenCalled();
    expect(h.onPrevious).toHaveBeenCalled();
    expect(h.onMuteChange).toHaveBeenCalledWith(true);
    expect(h.onSourceChange).toHaveBeenCalledWith("Radio");
    expect(h.onTurnOff).toHaveBeenCalled();
    expect(screen.getByRole("slider")).toBeTruthy();
  });

  it("ends its sheet with a raised Open in Home Assistant pill where the host has its player, and nowhere else", () => {
    const onOpenMore = vi.fn();
    const { container, unmount } = render(<MediaPlayerCard entity={playing} variant="sheet" {...press()} onTurnOff={vi.fn()} onOpenMore={onOpenMore} />);
    const pill = screen.getByRole("button", { name: "Open Kitchen speaker in Home Assistant" });
    expect(pill.textContent).toContain("Open in Home Assistant");
    // A one-shot action: not announced as a toggle, and the last of the sheet's controls.
    expect(pill.getAttribute("aria-pressed")).toBeNull();
    const controls = [...container.querySelectorAll(".hd-extra button")];
    expect(controls.at(-1)).toBe(pill);
    fireEvent.click(pill);
    expect(onOpenMore).toHaveBeenCalledTimes(1);
    unmount();
    // Never on the card's face, featured included, and never while unavailable.
    const { unmount: face } = render(<MediaPlayerCard entity={playing} footprint="featured" {...press()} onOpenMore={onOpenMore} />);
    expect(screen.queryByText("Open in Home Assistant")).toBeNull();
    face();
    render(<MediaPlayerCard entity={{ ...playing, state: "unavailable" }} variant="sheet" {...press()} onOpenMore={onOpenMore} />);
    expect(screen.queryByText("Open in Home Assistant")).toBeNull();
  });

  it("draws no pill to Home Assistant's player with no host to open it (a story, a standalone app)", () => {
    render(<MediaPlayerCard entity={playing} variant="sheet" {...press()} />);
    expect(screen.queryByText("Open in Home Assistant")).toBeNull();
  });

  it("offers nothing a player doesn't support", () => {
    const bare: MediaPlayerEntity = { entityId: "media_player.x", name: "X", state: "paused", title: "Die Moldau" };
    const h = { ...press(), onPrevious: vi.fn(), onNext: vi.fn(), onTurnOff: vi.fn(), onVolumeChange: vi.fn(), onMuteChange: vi.fn(), onSourceChange: vi.fn() };
    render(<MediaPlayerCard entity={bare} variant="sheet" {...h} />);
    expect(screen.queryByRole("slider")).toBeNull();
    expect(screen.queryByRole("button", { name: /next track/ })).toBeNull();
    expect(screen.getByText("View only")).toBeTruthy();
  });

  it("says Unavailable, draws no artwork and ignores the orb while unavailable", () => {
    const h = press();
    const { container } = render(<MediaPlayerCard entity={{ ...playing, state: "unavailable", lastSeen: "08:20" }} footprint="featured" {...h} />);
    fireEvent.click(screen.getByRole("button", { name: "Kitchen speaker: Unavailable" }));
    expect(h.onPause).not.toHaveBeenCalled();
    expect(screen.getByText("Last seen 08:20")).toBeTruthy();
    expect(container.querySelector(".hd-pic")).toBeNull();
  });

  it("seeks in the sheet along a groove, once, when it is let go, holding the target while it moves", () => {
    const onSeek = vi.fn(async () => true);
    const { container } = render(<MediaPlayerCard entity={playing} variant="sheet" {...press()} onSeek={onSeek} />);
    const groove = container.querySelector<HTMLElement>(".mp-seek")!;
    // The groove replaces the readout line, and is first in the sheet's controls.
    expect(container.querySelector(".mp-prog")).toBeNull();
    expect(container.querySelector(".hd-extra")?.firstElementChild).toBe(groove);
    Object.defineProperty(groove, "getBoundingClientRect", { value: () => ({ left: 0, width: 245 }) });
    Object.defineProperty(Element.prototype, "setPointerCapture", { value: vi.fn(), configurable: true });
    const hit = groove.querySelector(".hd-track-hit")!;
    const ptr = (type: string, x: number) => {
      const event = new MouseEvent(type, { bubbles: true, clientX: x, button: 0 });
      Object.defineProperties(event, { pointerId: { value: 1 }, pointerType: { value: "mouse" } });
      return event;
    };
    fireEvent(hit, ptr("pointerdown", 120));
    fireEvent(hit, ptr("pointermove", 140));
    fireEvent(hit, ptr("pointermove", 151));
    expect(groove.hasAttribute("data-held")).toBe(true);
    expect(onSeek).not.toHaveBeenCalled();
    expect([...container.querySelectorAll<HTMLElement>(".mp-seek-at .mp-reel")].map((reel) => reel.style.transform)).toEqual(["translateY(-20%)", "translateY(-50%)", "translateY(0%)"]);
    fireEvent(hit, ptr("pointerup", 151));
    expect(onSeek.mock.calls).toEqual([[150]]);
    expect(groove.hasAttribute("data-held")).toBe(false);
    expect(screen.getByRole("slider", { name: "Kitchen speaker position" }).getAttribute("aria-valuetext")).toBe("2 minutes 30 seconds of 4 minutes 5 seconds");
  });

  it("keeps how far in a readout on a featured card, for a player that can't seek, and under quiet", () => {
    const onSeek = vi.fn(async () => true);
    const featured = render(<MediaPlayerCard entity={playing} footprint="featured" {...press()} onSeek={onSeek} />);
    expect(featured.container.querySelector(".mp-seek")).toBeNull();
    expect(featured.container.querySelector(".mp-prog")).toBeTruthy();
    featured.unmount();
    const fixed = render(<MediaPlayerCard entity={{ ...playing, supportsSeek: false }} variant="sheet" {...press()} onSeek={onSeek} />);
    expect(fixed.container.querySelector(".mp-seek")).toBeNull();
    expect(fixed.container.querySelector(".mp-prog")).toBeTruthy();
    fixed.unmount();
    const quiet = render(<MediaPlayerCard entity={playing} variant="sheet" quiet {...press()} onSeek={onSeek} />);
    expect(quiet.container.querySelector(".mp-seek")).toBeNull();
    expect(quiet.container.querySelector(".mp-prog")).toBeNull();
  });

  it("steps the volume of a player that can't set it with Down and Up, each once, under what it says", () => {
    const h = { ...press(), onVolumeUp: vi.fn(), onVolumeDown: vi.fn(), onVolumeChange: vi.fn() };
    const tv = MEDIA_PLAYER_SEEDS.steps.entity;
    const { container, rerender } = render(<MediaPlayerCard entity={tv} variant="sheet" {...h} />);
    expect(screen.queryByRole("slider")).toBeNull();
    const group = screen.getByRole("group", { name: "Volume" });
    expect(group.querySelector(".hd-blk-v")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Living room TV: volume up" }));
    fireEvent.click(screen.getByRole("button", { name: "Living room TV: volume down" }));
    expect(h.onVolumeUp).toHaveBeenCalledTimes(1);
    expect(h.onVolumeDown).toHaveBeenCalledTimes(1);
    rerender(<MediaPlayerCard entity={{ ...tv, muted: true }} variant="sheet" {...h} />);
    expect(container.querySelector(".hd-blk-v")?.textContent).toBe("Muted");
    // A level reported but none to set: the level words, and Up lies flat at the top.
    rerender(<MediaPlayerCard entity={{ ...tv, state: "paused", volume: 100 }} variant="sheet" {...h} />);
    expect(container.querySelector(".hd-blk-v")?.textContent).toBe("Paused · 100%");
    expect((screen.getByRole("button", { name: "Living room TV: volume up" }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: "Living room TV: volume down" }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("draws the groove, not the steps, where a level is reported and can be set; neither while off", () => {
    const h = { ...press(), onVolumeUp: vi.fn(), onVolumeDown: vi.fn(), onVolumeChange: vi.fn() };
    const both = render(<MediaPlayerCard entity={{ ...playing, supportsVolumeStep: true }} variant="sheet" {...h} />);
    expect(screen.getByRole("slider")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /volume up/ })).toBeNull();
    both.unmount();
    render(<MediaPlayerCard entity={{ ...MEDIA_PLAYER_SEEDS.steps.entity, state: "standby" }} variant="sheet" {...h} />);
    expect(screen.queryByRole("button", { name: /volume up/ })).toBeNull();
  });

  it("keeps one state cue in the compact row", () => {
    const { container } = render(<MediaPlayerCard entity={{ ...playing, state: "off" }} footprint="compact" {...press()} />);
    expect(container.querySelector(".hd-sub")?.textContent).toBe("Off");
  });

  it("stops a player that can't pause while it plays, never turning it off", () => {
    const onStop = vi.fn();
    const onTurnOff = vi.fn();
    render(<MediaPlayerCard entity={MEDIA_PLAYER_SEEDS.stops.entity} {...press()} onStop={onStop} onTurnOff={onTurnOff} />);
    fireEvent.click(screen.getByRole("button", { name: "Stop Workshop radio" }));
    expect(onStop).toHaveBeenCalledOnce();
    expect(onTurnOff).not.toHaveBeenCalled();
  });

  it("offers on and off apart in the sheet, in place of Turn off, while Home Assistant only assumes its state", () => {
    const onTurnOn = vi.fn();
    render(<MediaPlayerCard entity={MEDIA_PLAYER_SEEDS.assumed.entity} variant="sheet" {...press()} onTurnOn={onTurnOn} onTurnOff={vi.fn()} />);
    expect(screen.queryByRole("button", { name: "Turn Bedroom TV off" })).toBeNull();
    fireEvent.click(within(screen.getByRole("group", { name: "Turn" })).getByRole("button", { name: "On" }));
    expect(onTurnOn).toHaveBeenCalledOnce();
  });
});
