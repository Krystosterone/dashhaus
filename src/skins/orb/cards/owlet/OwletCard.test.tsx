import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { OwletCard } from "./OwletCard";
import type { OwletEntity } from "../../../../domains/owlet/types";

const sock: OwletEntity = { entityId: "sensor.owlet_sock_1_sleep_state", name: "Nova", area: "Nursery", state: "deep_sleep", heartRate: 121.4, oxygen: 98 };

describe("OwletCard", () => {
  it("is a reading: no glow, a bare icon, its class prefix", () => {
    const { container } = render(<OwletCard entity={sock} />);
    const card = container.querySelector("article");
    expect(card?.getAttribute("data-role")).toBe("reading");
    expect(card?.getAttribute("data-glow")).toBeNull();
    expect(card?.className).toBe("hd ow");
    expect(container.querySelector(".hd-orb--static")).not.toBeNull();
  });

  it("says the sleep state and reads both figures aloud", () => {
    render(<OwletCard entity={sock} />);
    expect(screen.getByText("Deep sleep")).toBeTruthy();
    expect(screen.getByRole("img", { name: "heart rate 121 beats per minute, oxygen 98 percent" })).toBeTruthy();
  });

  it("opens details from the readings", () => {
    let opened = false;
    render(<OwletCard entity={sock} onOpenDetails={() => { opened = true; }} />);
    screen.getByRole("button", { name: "Nova: heart rate 121 beats per minute, oxygen 98 percent. Open details" }).click();
    expect(opened).toBe(true);
  });

  it("keeps the readings when the sleep state is unknown, without dimming them", () => {
    const { container } = render(<OwletCard entity={{ ...sock, state: "unavailable" }} />);
    expect(container.querySelector("article")?.getAttribute("data-state")).toBe("unknown");
    expect(screen.getByText("Sleep state unknown")).toBeTruthy();
    expect(screen.getByRole("img", { name: /heart rate 121/ })).toBeTruthy();
  });

  it("is unavailable when the sock reports nothing", () => {
    const { container } = render(<OwletCard entity={{ ...sock, state: "unavailable", heartRate: undefined, oxygen: undefined, lastSeen: "07:12" }} />);
    expect(container.querySelector("article")?.getAttribute("data-state")).toBe("unavailable");
    expect(screen.getByText("Last seen 07:12")).toBeTruthy();
  });

  it("beats the heart and says live while readings arrive", () => {
    const { container } = render(<OwletCard entity={{ ...sock, live: true }} />);
    expect(container.querySelector(".ow-heart[data-live]")).not.toBeNull();
    expect(screen.getByRole("img", { name: "live, heart rate 121 beats per minute, oxygen 98 percent" })).toBeTruthy();
    expect(container.querySelector("article")?.getAttribute("data-alert")).toBeNull();
  });

  it("warns since when once readings stop, with the heart still", () => {
    const { container } = render(<OwletCard entity={{ ...sock, live: false, lastUpdated: "11:49" }} />);
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
    const { container } = render(<OwletCard entity={{ ...sock, state: "unavailable", heartRate: undefined, oxygen: undefined, live: false }} />);
    expect(container.querySelector("article")?.getAttribute("data-alert")).toBeNull();
  });

  it("fills the slot with the vitals alert and its figure, like a triggered alarm", () => {
    const { container } = render(<OwletCard entity={{ ...sock, oxygen: 86, alerts: ["low_battery", "low_oxygen"] }} />);
    const alarm = screen.getByRole("alert");
    expect(alarm.textContent).toBe("Low oxygen86% O₂");
    expect(container.querySelector("article")?.getAttribute("data-alert")).toBe("alarm");
    expect(container.querySelector("article")?.getAttribute("data-glow")).toBeNull();
    // The device problem still leads the status line.
    expect(screen.getByRole("img", { name: "Warning: Battery low on Nova's sock" })).toBeTruthy();
  });

  it("names every vitals alert, the most urgent first, with the matching figure", () => {
    const { container } = render(<OwletCard entity={{ ...sock, heartRate: 71, alerts: ["low_heart_rate", "critical_oxygen"] }} footprint="compact" showControl={false} />);
    expect(screen.getByRole("alert").textContent).toBe("Critical oxygen · Low heart rate98% O₂");
    expect(container.querySelector(".hd-sub")?.textContent).toBe("Critical oxygen · 98% O₂ · Low heart rate");
  });

  it("sounds the alarm even when the readings are gone, and in a compact row without its control", () => {
    render(<OwletCard entity={{ ...sock, state: "unavailable", heartRate: undefined, oxygen: undefined, alerts: ["low_heart_rate"] }} footprint="compact" showControl={false} />);
    expect(screen.getByRole("alert").textContent).toBe("Low heart rate");
  });

  it("leads the status line with a device problem in words, over a stale warning", () => {
    render(<OwletCard entity={{ ...sock, live: false, lastUpdated: "11:49", alerts: ["sock_off"] }} />);
    expect(screen.getByText("Sock off")).toBeTruthy();
    expect(screen.queryByText("No new reading since 11:49")).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("says Charging, not Unavailable, while the sock is on its charger", () => {
    render(<OwletCard entity={{ ...sock, state: "unavailable", heartRate: undefined, oxygen: undefined, charging: true }} />);
    expect(screen.getByText("Charging")).toBeTruthy();
  });

  it("lists every alert in the sheet", () => {
    render(<OwletCard entity={{ ...sock, alerts: ["low_battery", "high_heart_rate"] }} variant="sheet" />);
    expect(screen.getByRole("heading", { name: "Alerts" })).toBeTruthy();
    expect(screen.getAllByRole("listitem").map((li) => li.textContent)).toEqual(["High heart rate", "Battery low"]);
  });

  it("puts the vitals alert on the compact value line, and the figures on the status line beside the pill", () => {
    const { container } = render(<OwletCard entity={{ ...sock, oxygen: 86, alerts: ["low_oxygen"] }} footprint="compact" />);
    expect(container.querySelector(".hd-sub")?.textContent).toBe("Low oxygen · 86% O₂");
    expect(container.querySelector(".hd-area")?.textContent).toBe("121 bpm · 86% O₂");
  });

  it("puts the sleep state and the readings on the compact value line", () => {
    const { container } = render(<OwletCard entity={sock} footprint="compact" />);
    expect(container.querySelector(".hd-sub")?.textContent).toBe("Deep sleep · 121 bpm · 98% O₂");
  });

  it("says when the base station is off, and switches it in the sheet only", () => {
    let toggled = 0;
    const onBaseToggle = () => { toggled++; };
    const { container, rerender } = render(<OwletCard entity={{ ...sock, baseOn: false }} onBaseToggle={onBaseToggle} />);
    expect(container.querySelector(".hd-area")?.textContent).toBe("Base station off · Deep sleep");
    expect(screen.queryByRole("button", { name: /Base station/ })).toBeNull();
    rerender(<OwletCard entity={{ ...sock, baseOn: false }} onBaseToggle={onBaseToggle} variant="sheet" />);
    screen.getByRole("button", { name: "Base station: Off · Turn on" }).click();
    rerender(<OwletCard entity={{ ...sock, baseOn: true }} onBaseToggle={onBaseToggle} variant="sheet" />);
    expect(screen.getByRole("button", { name: "Base station: On · Turn off" }).getAttribute("aria-pressed")).toBe("true");
    expect(toggled).toBe(1);
  });

  it("hides the base station switch while its state is unknown", () => {
    render(<OwletCard entity={sock} onBaseToggle={() => {}} variant="sheet" />);
    expect(screen.queryByRole("button", { name: /Base station/ })).toBeNull();
  });
});
