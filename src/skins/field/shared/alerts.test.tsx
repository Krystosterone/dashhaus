import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { ComponentType } from "react";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import type { Severity } from "@dashhaus/core/entities/severity";
import { alarmSeverity } from "@dashhaus/core/entities/alarm/severity";
import { binarySensorSeverity } from "@dashhaus/core/entities/binarySensor/severity";
import { lockSeverity } from "@dashhaus/core/entities/lock/severity";
import { owletSeverity } from "@dashhaus/core/entities/owlet/severity";
import { vacuumSeverity } from "@dashhaus/core/entities/vacuum/severity";
import type { OwletEntity } from "@dashhaus/core/entities/owlet/types";
import { ALARM_SEEDS, ALARM_WORST_CASE } from "@dashhaus/core/seeds/alarm";
import { BINARY_SENSOR_SEEDS, BINARY_SENSOR_WORST_CASE } from "@dashhaus/core/seeds/binarySensor";
import { LOCK_SEEDS, LOCK_WORST_CASE } from "@dashhaus/core/seeds/lock";
import { OWLET_SEEDS, OWLET_WORST_CASE } from "@dashhaus/core/seeds/owlet";
import { VACUUM_SEEDS, VACUUM_WORST_CASE } from "@dashhaus/core/seeds/vacuum";
import { AlarmModule } from "../cards/alarm/AlarmModule";
import { BinarySensorModule } from "../cards/binarySensor/BinarySensorModule";
import { LockModule } from "../cards/lock/LockModule";
import { OwletModule } from "../cards/owlet/OwletModule";
import { VacuumModule } from "../cards/vacuum/VacuumModule";
import { AlertLine, AlertsProvider } from "./alerts";
import type { Pressing } from "./alerts";
import { ModuleFrame, useDetails } from "./ui";

function Probe({ name, level, what, startedAt }: { name: string; level?: Pressing; what?: string; startedAt?: number }) {
  const details = useDetails();
  return (
    <ModuleFrame
      kind="fd-zz"
      name={name}
      state="on"
      details={details}
      alert={level && what ? { level, what, startedAt, say: `Alarm: ${name}, ${what}.` } : undefined}
      pict={null}
      read="ON"
      lead={null}
      row={null}
    >
      <p>{name} inside</p>
    </ModuleFrame>
  );
}

const line = () => screen.queryByRole("region", { name: "Alerts" });
const entries = () => within(line()!).getAllByRole("button").map((b) => b.textContent);

describe("the alert line", () => {
  // jsdom has no modal dialog; these do what a browser's do to the `open` attribute.
  beforeEach(() => {
    HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) { this.setAttribute("open", ""); };
    HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) { this.removeAttribute("open"); };
  });

  it("shows nothing while nothing is pressing", () => {
    render(<AlertsProvider><AlertLine /><Probe name="Hall" /></AlertsProvider>);
    expect(line()).toBeNull();
  });

  it("lists what its modules report, alarms first, and a tap opens that module's details", () => {
    render(
      <AlertsProvider>
        <AlertLine />
        <Probe name="Garage door" level="urgent" what="Open at night" />
        <Probe name="Nova" level="alarm" what="Critical oxygen 79%" />
      </AlertsProvider>,
    );
    expect(entries()).toEqual(["AlarmAlarm: Nova · Critical oxygen 79%", "UrgentUrgent: Garage door · Open at night"]);
    fireEvent.click(within(line()!).getAllByRole("button")[0]);
    expect(screen.getByRole("dialog", { name: "Nova details" }).textContent).toContain("Nova inside");
  });

  it("shows three, then how many more, and drops a module's entry once it clears", () => {
    const four = (cleared?: boolean) => (
      <AlertsProvider>
        <AlertLine />
        {["A", "B", "C"].map((n) => <Probe key={n} name={n} level="urgent" what="Sock off" />)}
        <Probe name="D" level={cleared ? undefined : "urgent"} what="Sock off" />
      </AlertsProvider>
    );
    const { rerender } = render(four());
    expect(entries()).toHaveLength(4);
    expect(entries()[3]).toBe("+1 more");
    fireEvent.click(screen.getByRole("button", { name: "+1 more" }));
    expect(entries()).toHaveLength(5);
    act(() => rerender(four(true)));
    expect(entries()).toHaveLength(3);
  });

  it("draws the level on the module, and announces an alarm", () => {
    const { container } = render(<Probe name="Nova" level="alarm" what="Low oxygen" />);
    expect(container.querySelector(".fd-module")?.getAttribute("data-level")).toBe("alarm");
    expect(screen.getByRole("alert").textContent).toBe("Alarm: Nova, Low oxygen.");
  });

  it("keeps an alarm's flash in phase with when it started, on the module and its tag, so a remount never replays it", () => {
    const { container } = render(<AlertsProvider><AlertLine /><Probe name="Nova" level="alarm" what="Low oxygen" startedAt={Date.now() - 4_000} /></AlertsProvider>);
    const delay = (el: Element | null) => Number.parseFloat((el as HTMLElement | null)?.style.getPropertyValue("--fd-alarm-delay") ?? "");
    expect(delay(container.querySelector(".fd-module"))).toBeCloseTo(-4, 0);
    expect(delay(container.querySelector(".fd-alerts-tag"))).toBeCloseTo(-4, 0);
  });

  it("orders the line by when each started, when the host knows", () => {
    render(
      <AlertsProvider>
        <AlertLine />
        <Probe name="Older" level="urgent" what="Sock off" startedAt={Date.now() - 60_000} />
        <Probe name="Newer" level="urgent" what="Sock off" startedAt={Date.now() - 1_000} />
      </AlertsProvider>,
    );
    expect(entries()).toEqual(["UrgentUrgent: Newer · Sock off", "UrgentUrgent: Older · Sock off"]);
  });
});

/*
 * A module's level is its model's core severity, as Orb's card's is (src/skins/orb/cards/alerts.test.tsx): Field writes
 * only what is pressing, urgent and alarm, on the module as `data-level`, and leaves advisory out (spec/cards.md, spec/
 * field.md → Severity). Every seed of every module that reports an alert, its demo seeds and its worst case, in both
 * footprints, says core's level when it is pressing and none otherwise. A card folder whose module passes `alert` and
 * isn't listed here fails, so a new module's level is held as soon as it has one.
 */
type Seed = { entity: { name: string } };
interface Leveled { seeds: Seed[]; Module: ComponentType<Record<string, unknown>>; level: (seed: never) => Severity | undefined }
const leveled = <S extends Seed>(seeds: Readonly<Record<string, NoInfer<S>>>, worst: readonly S[], Module: ComponentType<never>, level: (seed: NoInfer<S>) => Severity | undefined): Leveled =>
  ({ seeds: [...Object.values(seeds), ...worst], Module: Module as ComponentType<Record<string, unknown>>, level: level as never });
/** A sock's readings stopped, as its module works it out: live false while it still reads anything. */
const owletStale = (e: OwletEntity) => e.live === false && !(e.state === "unavailable" && e.heartRate == null && e.oxygen == null);
const LEVELED: Record<string, Leveled> = {
  alarm: leveled(ALARM_SEEDS, ALARM_WORST_CASE, AlarmModule as never, (seed) => alarmSeverity(seed.entity)),
  binarySensor: leveled(BINARY_SENSOR_SEEDS, BINARY_SENSOR_WORST_CASE, BinarySensorModule as never, (seed) => binarySensorSeverity(seed.entity)),
  lock: leveled(LOCK_SEEDS, LOCK_WORST_CASE, LockModule as never, (seed) => lockSeverity(seed.entity)),
  owlet: leveled(OWLET_SEEDS, OWLET_WORST_CASE, OwletModule as never, (seed) => owletSeverity(seed.entity.alerts, owletStale(seed.entity))),
  vacuum: leveled(VACUUM_SEEDS, VACUUM_WORST_CASE, VacuumModule as never, (seed) => vacuumSeverity(seed.entity)),
};
const PRESSING: (Severity | undefined)[] = ["urgent", "alarm"];
const cards = join(process.cwd(), "src/skins/field/cards");
/** The card folders whose drawing (not their tests or stories) passes the module an alert. */
const reportsAlerts = readdirSync(cards, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name)
  .filter((name) => readdirSync(join(cards, name), { recursive: true, encoding: "utf8" })
    .filter((file) => /\.tsx?$/.test(file) && !/\.(test|stories)\.tsx?$/.test(file))
    .some((file) => /\balert=\{/.test(readFileSync(join(cards, name, file), "utf8"))));

describe("a module's level is core's severity, when it is pressing", () => {
  it("holds every module that reports an alert", () => {
    expect(Object.keys(LEVELED).sort()).toEqual([...reportsAlerts].sort());
  });

  for (const [name, { seeds, Module, level }] of Object.entries(LEVELED)) {
    it(`${name}: data-level is core's urgent or alarm, and absent otherwise`, () => {
      const wrong: string[] = [];
      const said = new Set<string>();
      for (const seed of seeds) {
        const ranked = level(seed as never);
        const expected = PRESSING.includes(ranked) ? ranked! : null;
        for (const footprint of ["compact", "standard"]) {
          const { container } = render(<Module {...(seed as Record<string, unknown>)} footprint={footprint} />);
          const modules = [...container.querySelectorAll(".fd-module")];
          if (!modules.length) wrong.push(`${seed.entity.name} (${footprint}): no module drawn`);
          for (const module of modules) {
            const got = module.getAttribute("data-level");
            if (got) said.add(got);
            if (got !== expected) wrong.push(`${seed.entity.name} (${footprint}): data-level ${got} where core ranks ${ranked ?? "none"}`);
          }
          cleanup();
        }
      }
      expect(said.size, "no seed draws a level").toBeGreaterThan(0);
      expect(wrong).toEqual([]);
    });
  }
});
