import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SunCard } from "./SunCard";
import { SUN_SEEDS } from "@dashhaus/core/seeds/sun";
import type { SunEntity } from "@dashhaus/core/entities/sun/types";

const at = (day: number, hour: number, minute = 0) => new Date(2026, 9, day, hour, minute).getTime();
const entity: SunEntity = {
  entityId: "sun.sun", name: "Sun", state: "ok", up: true, now: at(19, 15, 55),
  nextSetting: at(19, 20, 30), nextDusk: at(19, 21, 4), nextDawn: at(20, 4, 25), nextRising: at(20, 5, 1), nextNoon: at(20, 12, 46),
  elevation: 46, azimuth: 250, lastUpdated: "15:51",
};

describe("SunCard", () => {
  it("is a reading: no glow, a bare icon, its class prefix", () => {
    const { container } = render(<SunCard entity={entity} />);
    const card = container.querySelector("article");
    expect(card?.getAttribute("data-role")).toBe("reading");
    expect(card?.getAttribute("data-glow")).toBeNull();
    expect(card?.className).toBe("hd su");
    expect(container.querySelector(".hd-orb--static")).not.toBeNull();
  });

  it("leads with the sunset while it is up, counting down to it, the sunrise beside it", () => {
    const { container } = render(<SunCard entity={entity} />);
    expect(container.querySelector(".su-f")?.textContent).toBe("20:30");
    expect(container.querySelector(".su-after")?.textContent).toBe("Sunrise05:01");
    expect(container.querySelector(".hd-area")?.textContent).toBe("Sets in 4h 35m");
    expect(container.querySelector("article")?.getAttribute("data-state")).toBe("on");
  });

  it("leads with the sunrise while it is down", () => {
    const { container } = render(<SunCard entity={{ ...entity, up: false, now: at(19, 20, 49), nextSetting: at(20, 20, 28) }} />);
    expect(container.querySelector(".su-f")?.textContent).toBe("05:01");
    expect(container.querySelector(".hd-area")?.textContent).toBe("Rises in 8h 12m");
    expect(container.querySelector("article")?.getAttribute("data-state")).toBe("ok");
  });

  it("reads what comes next aloud and opens details from it", () => {
    const onOpenDetails = vi.fn();
    render(<SunCard entity={entity} onOpenDetails={onOpenDetails} />);
    screen.getByRole("button", { name: "Sun: Sunset at 20:30, sets in 4h 35m. Open details" }).click();
    expect(onOpenDetails).toHaveBeenCalled();
  });

  it("says up all day in words where no sunset is reported", () => {
    const { container } = render(<SunCard entity={{ ...entity, nextSetting: undefined }} />);
    expect(container.querySelector(".su-f")?.textContent).toBe("Up all day");
    expect(container.querySelector(".su-after")).toBeNull();
  });

  it("waits for its first report in words", () => {
    const { container } = render(<SunCard entity={{ entityId: "sun.sun", name: "Sun", state: "ok", now: entity.now }} />);
    expect(screen.getByRole("img", { name: "No reading yet" })).toBeTruthy();
    expect(container.querySelector(".hd-area")?.textContent).toBe("No reading yet");
  });

  it("says nothing it knew while unavailable", () => {
    const { container } = render(<SunCard entity={{ entityId: "sun.sun", name: "Sun", state: "unavailable", now: entity.now, lastSeen: "08:20" }} footprint="compact" />);
    expect(container.querySelector(".hd-sub")?.textContent).toBe("Unavailable");
  });

  it("draws today's path on the featured card, with now and the sun on it", () => {
    const seed = SUN_SEEDS.normal;
    const { container } = render(<SunCard entity={seed.entity} history={seed.history} footprint="featured" />);
    expect(screen.getByRole("img", { name: /^The sun's path today, sunrise \d\d:\d\d, sunset \d\d:\d\d, highest 34°, up now$/ })).toBeTruthy();
    expect(container.querySelectorAll(".su-mark")).toHaveLength(2);
    expect(container.querySelector(".su-sun[data-up]")).not.toBeNull();
    expect(container.querySelector(".su-now")).not.toBeNull();
  });

  it("keeps the path but draws neither now nor the sun while unavailable", () => {
    const seed = SUN_SEEDS.unavailable;
    const { container } = render(<SunCard entity={seed.entity} history={seed.history} footprint="featured" />);
    expect(container.querySelector(".su-path .hd-blk-v")?.textContent).toBe("Unavailable since 08:20");
    expect(container.querySelector(".su-sun")).toBeNull();
    expect(container.querySelector(".su-now")).toBeNull();
  });

  it("lists every time to come in the sheet, and where the sun is", () => {
    const { container } = render(<SunCard entity={entity} variant="sheet" />);
    expect([...container.querySelectorAll(".su-ev")].map((li) => li.textContent)).toEqual([
      "Sunset20:30", "Dusk21:04", "DawnTomorrow 04:25", "SunriseTomorrow 05:01", "NoonTomorrow 12:46",
    ]);
    expect(container.querySelector(".hd-info")?.textContent).toContain("Elevation 46° · Azimuth 250°");
  });
});
