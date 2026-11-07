import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CameraModule } from "./CameraModule";
import { CAMERA_SEEDS } from "@dashhaus/core/seeds/camera";

/*
 * What every field module does, whatever it is: a reading has no keys, and unavailable blanks the screen and says when
 * it was last seen (spec/field.md → Unavailable). The frame (footprints, details) is ModuleFrame's, tested in
 * shared/ui.test.tsx; test what this camera itself does here.
 */
const draw = (seed: keyof typeof CAMERA_SEEDS, props: Partial<Parameters<typeof CameraModule>[0]> = {}) =>
  render(<CameraModule entity={CAMERA_SEEDS[seed].entity} {...props} />);

describe("CameraModule", () => {
  it("is a reading: nothing on it is a key", () => {
    const { container } = draw("idle");
    expect(container.querySelectorAll(".fd-module .fd-key")).toHaveLength(0);
  });

  it("says its state at four places, in words for a screen reader, and in words on the meta line", () => {
    const { container } = draw("recording");
    expect(container.querySelector(".fd-read-fig")?.textContent).toBe("RECRecording");
    expect(container.querySelector(".fd-meta")?.textContent).toMatch(/^Recording/);
    expect(draw("streaming").container.querySelector(".fd-read-fig [aria-hidden]")?.textContent).toBe("LIVE");
  });

  it("draws the still as a window beside the screen, and none in a row", () => {
    expect(draw("idle").container.querySelector(".fd-cm-body .fd-pic")).not.toBeNull();
    const row = draw("idle", { footprint: "compact" }).container;
    expect(row.querySelector(".fd-pic")).toBeNull();
    expect(row.querySelector(".fd-module > .fd-glyph")).not.toBeNull();
  });

  it("draws no window and asks for nothing with its stills switched off", () => {
    const { container } = draw("idle", { still: false });
    expect(container.querySelector(".fd-pic")).toBeNull();
    expect(container.querySelector("img")).toBeNull();
  });

  it("says No picture on the meta line when there is none to show, never over the picture", () => {
    const { container } = draw("noStill");
    expect(container.querySelector(".fd-meta-2")?.textContent).toBe("No picture");
    expect(container.querySelector(".fd-pic")?.textContent).toBe("");
  });

  it("blanks the screen while unavailable, says when it was last seen, and draws no frame", () => {
    const { container } = draw("unavailable");
    expect(container.querySelector(".fd-digits")?.getAttribute("data-pad")).toBe("----");
        expect(container.querySelector(".fd-meta")?.textContent).toBe("UnavailableLast seen 08:20");
    expect(container.querySelector(".fd-pic")?.getAttribute("data-status")).toBe("unavailable");
    expect(container.querySelector("img")).toBeNull();
  });

  it("opens the live stream from the still where the host has one, and the panel from the name", () => {
    const onOpenLive = vi.fn();
    draw("idle", { onOpenLive });
    fireEvent.click(screen.getByRole("button", { name: "Front door: Idle. Open live view" }));
    expect(onOpenLive).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Front door details" }));
    expect(screen.getByRole("dialog")).toBeTruthy();
  });

  it("carries a Live key in the panel where there is a stream, so stills off still reach it", () => {
    const onOpenLive = vi.fn();
    draw("idle", { onOpenLive, still: false, defaultOpen: true });
    const panel = screen.getByRole("dialog");
    fireEvent.click(within(panel).getByRole("button", { name: "Open Front door's live view" }));
    expect(onOpenLive).toHaveBeenCalledTimes(1);
  });

  it("draws no Live key with no stream to open, nor while unavailable", () => {
    draw("idle", { defaultOpen: true });
    expect(screen.queryByRole("button", { name: /live view/ })).toBeNull();
    draw("unavailable", { onOpenLive: () => {}, defaultOpen: true });
    expect(screen.queryByRole("button", { name: /live view/ })).toBeNull();
  });

  it("opens the panel from the still where there is no stream, with the whole still and what the camera is", () => {
    draw("idle");
    fireEvent.click(screen.getByRole("button", { name: "Front door: Idle. Open details" }));
    const panel = screen.getByRole("dialog");
    expect(panel.querySelector(".fd-pic[data-fit='contain']")).not.toBeNull();
    expect(panel.textContent).toContain("Reolink Video Doorbell · motion detection on");
  });

  it("starts the panel's small print with when, and ends it with what the camera is", () => {
    draw("idle", { defaultOpen: true });
    const facts = [...(screen.getByRole("dialog").querySelector(".fd-info")?.children ?? [])].map((s) => s.textContent);
    expect(facts[0]).toMatch(/^Last changed /);
    expect(facts.at(-1)).toBe("Reolink Video Doorbell · motion detection on");
  });

  it("says Last seen in the panel's small print while unavailable, never Seen", () => {
    draw("unavailable", { defaultOpen: true });
    expect(screen.getByRole("dialog").querySelector(".fd-info")?.firstElementChild?.textContent).toBe("Last seen 08:20");
  });
});
