import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { OwletWidget } from "./OwletWidget";
import type { OwletEntity } from "./types";

const sock: OwletEntity = { entityId: "sensor.owlet_sock_1_sleep_state", name: "Nova", area: "Nursery", state: "deep_sleep", heartRate: 121.4, oxygen: 98 };

describe("OwletWidget", () => {
  it("is a reading: no glow, a bare icon, its class prefix", () => {
    const { container } = render(<OwletWidget entity={sock} />);
    const card = container.querySelector("article");
    expect(card?.getAttribute("data-role")).toBe("reading");
    expect(card?.getAttribute("data-glow")).toBeNull();
    expect(card?.className).toBe("hd ow");
    expect(container.querySelector(".hd-orb--static")).not.toBeNull();
  });

  it("says the sleep state and reads both figures aloud", () => {
    render(<OwletWidget entity={sock} />);
    expect(screen.getByText("Deep sleep")).toBeTruthy();
    expect(screen.getByRole("img", { name: "heart rate 121 beats per minute, oxygen 98 percent" })).toBeTruthy();
  });

  it("opens details from the readings", () => {
    let opened = false;
    render(<OwletWidget entity={sock} onOpenDetails={() => { opened = true; }} />);
    screen.getByRole("button", { name: "Nova: heart rate 121 beats per minute, oxygen 98 percent. Open details" }).click();
    expect(opened).toBe(true);
  });

  it("keeps the readings when the sleep state is unknown, without dimming them", () => {
    const { container } = render(<OwletWidget entity={{ ...sock, state: "unavailable" }} />);
    expect(container.querySelector("article")?.getAttribute("data-state")).toBe("unknown");
    expect(screen.getByText("Sleep state unknown")).toBeTruthy();
    expect(screen.getByRole("img", { name: /heart rate 121/ })).toBeTruthy();
  });

  it("is unavailable when the sock reports nothing", () => {
    const { container } = render(<OwletWidget entity={{ ...sock, state: "unavailable", heartRate: undefined, oxygen: undefined, lastSeen: "07:12" }} />);
    expect(container.querySelector("article")?.getAttribute("data-state")).toBe("unavailable");
    expect(screen.getByText("Last seen 07:12")).toBeTruthy();
  });

  it("beats the heart and says live while readings arrive", () => {
    const { container } = render(<OwletWidget entity={{ ...sock, live: true }} />);
    expect(container.querySelector(".ow-heart[data-live]")).not.toBeNull();
    expect(screen.getByRole("img", { name: "live, heart rate 121 beats per minute, oxygen 98 percent" })).toBeTruthy();
    expect(container.querySelector("article")?.getAttribute("data-alert")).toBeNull();
  });

  it("warns since when once readings stop, with the heart still", () => {
    const { container } = render(<OwletWidget entity={{ ...sock, live: false, lastUpdated: "11:49" }} />);
    const card = container.querySelector("article");
    expect(card?.getAttribute("data-alert")).toBe("warn");
    expect(card?.hasAttribute("data-stale")).toBe(true);
    expect(container.querySelector(".ow-heart[data-live]")).toBeNull();
    expect(screen.getByText("No new reading since 11:49")).toBeTruthy();
    expect(screen.getByText("Stopped 11:49")).toBeTruthy();
    expect(screen.getByRole("img", { name: "Warning: Nova's sock has sent no new reading since 11:49" })).toBeTruthy();
    expect(screen.getByRole("img", { name: "heart rate 121 beats per minute, oxygen 98 percent, no new reading since 11:49" })).toBeTruthy();
  });

  it("never calls an offline sock stale", () => {
    const { container } = render(<OwletWidget entity={{ ...sock, state: "unavailable", heartRate: undefined, oxygen: undefined, live: false }} />);
    expect(container.querySelector("article")?.getAttribute("data-alert")).toBeNull();
  });

  it("puts the sleep state and the readings on the compact value line", () => {
    const { container } = render(<OwletWidget entity={sock} footprint="compact" />);
    expect(container.querySelector(".hd-sub")?.textContent).toBe("Deep sleep · 121 bpm · 98% O₂");
  });
});
