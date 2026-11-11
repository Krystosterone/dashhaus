/**
 * An Orb warning names its card first (spec/orb.md → One palette, Warn orange): every warn marker a card draws
 * (`AlertStatus`, whose cue is `.hd-alert-cue`) is labelled `Warning: <name>: <what>`, or `Alert: <name>: <what>` for an
 * alarm, so a screen reader moving through a page of cards hears whose warning it is before what it says.
 *
 * This draws every seed of every card that draws one, its demo seeds and its worst case, in each footprint and in its
 * sheet, and holds every label it finds. A card folder whose drawing uses `AlertStatus` and isn't listed here fails, so a
 * new card's warning is held as soon as it draws one.
 *
 * The same drawings hold the card's level (spec/orb.md → Composing for a glance): every article says core's `Severity`
 * for its entity as `data-level`, absent with none, and no article with a level glows, since the dashboard's budget
 * (`dashboards/layout.css`) counts a glow and a level apart. A card folder that passes `CardFrame` a `level` is listed
 * here too.
 *
 * And they hold how the level is drawn (spec/orb.md → One palette, Warn orange): urgent apart from advisory by shape,
 * never by ink. An urgent card's status-line marker is solid (`data-level="urgent"`), an advisory card draws none solid,
 * and in a compact row whose one cue is its value (no control, or a reading's figures) an urgent warning takes that
 * cue behind a solid marker, said once by the status line; a control's row keeps its control.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { ReactNode } from "react";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { CardFootprint } from "../shared/ui";
import { AlarmTile } from "./alarm/AlarmTile";
import { ALARM_SEEDS, ALARM_WORST_CASE, useDemoAlarm } from "@dashhaus/core/seeds/alarm";
import type { AlarmSeed } from "@dashhaus/core/seeds/alarm";
import { CoverTile } from "./cover/CoverTile";
import { COVER_SEEDS, COVER_WORST_CASE, useDemoCover } from "@dashhaus/core/seeds/cover";
import type { CoverSeed } from "@dashhaus/core/seeds/cover";
import { WeatherTile } from "./weather/WeatherTile";
import { WEATHER_SEEDS, WEATHER_WORST_CASE } from "@dashhaus/core/seeds/weather";
import { SensorTile } from "./sensor/SensorTile";
import { SENSOR_SEEDS, SENSOR_WORST_CASE } from "@dashhaus/core/seeds/sensor";
import { DemoLockTile } from "./lock/demo/DemoLockTile";
import { LOCK_SEEDS, LOCK_WORST_CASE } from "@dashhaus/core/seeds/lock";
import { DemoOwletTile } from "./owlet/demo/DemoOwletTile";
import { OWLET_SEEDS, OWLET_WORST_CASE } from "@dashhaus/core/seeds/owlet";
import { DemoBinarySensorTile } from "./binarySensor/demo/DemoBinarySensorTile";
import { BINARY_SENSOR_SEEDS, BINARY_SENSOR_WORST_CASE } from "@dashhaus/core/seeds/binarySensor";
import { DemoVacuumTile } from "./vacuum/demo/DemoVacuumTile";
import { VACUUM_SEEDS, VACUUM_WORST_CASE } from "@dashhaus/core/seeds/vacuum";
import { DemoNumericTile } from "./numeric/demo/DemoNumericTile";
import { NUMERIC_SEEDS, NUMERIC_WORST_CASE } from "@dashhaus/core/seeds/numeric";
import { DemoDysonTile } from "./dyson/demo/DemoDysonTile";
import { DYSON_SEEDS, DYSON_WORST_CASE } from "@dashhaus/core/seeds/dyson";
import type { Severity } from "@dashhaus/core/entities/severity";
import { alarmSeverity } from "@dashhaus/core/entities/alarm/severity";
import { binarySensorSeverity } from "@dashhaus/core/entities/binarySensor/severity";
import { coverSeverity } from "@dashhaus/core/entities/cover/severity";
import { dysonSeverity } from "@dashhaus/core/entities/dyson/air";
import { lockSeverity } from "@dashhaus/core/entities/lock/severity";
import { numericSeverity } from "@dashhaus/core/entities/numeric/severity";
import { owletSeverity } from "@dashhaus/core/entities/owlet/severity";
import { sensorSeverity } from "@dashhaus/core/entities/sensor/severity";
import { vacuumSeverity } from "@dashhaus/core/entities/vacuum/severity";
import { weatherSeverity } from "@dashhaus/core/entities/weather/severity";
import type { OwletEntity } from "@dashhaus/core/entities/owlet/types";

type Draw<S> = (seed: S, footprint: CardFootprint, open: boolean, showControl?: boolean) => ReactNode;
/** What core ranks the seed's entity: the level its card must say. */
type Level<S> = (seed: S) => Severity | undefined;
interface Card { seeds: readonly { entity: { name: string } }[]; draw: Draw<never>; level: Level<never> }
const card = <S extends { entity: { name: string } }>(seeds: Readonly<Record<string, NoInfer<S>>>, worst: readonly S[], level: Level<NoInfer<S>>, draw: Draw<NoInfer<S>>): Card =>
  ({ seeds: [...Object.values(seeds), ...worst], draw: draw as Draw<never>, level: level as Level<never> });

/** A sock's readings stopped: core's `stale`, as its card works it out (live false while it still reads anything). */
const owletStale = (e: OwletEntity) => e.live === false && !(e.state === "unavailable" && e.heartRate == null && e.oxygen == null);

function Alarm({ seed, footprint, open, showControl }: { seed: AlarmSeed; footprint: CardFootprint; open: boolean; showControl?: boolean }) {
  return <AlarmTile {...useDemoAlarm(seed)} footprint={footprint} showControl={showControl} defaultOpen={open} readOnly={seed.readOnly} />;
}

function Cover({ seed, footprint, open, showControl }: { seed: CoverSeed; footprint: CardFootprint; open: boolean; showControl?: boolean }) {
  return <CoverTile {...useDemoCover(seed)} footprint={footprint} showControl={showControl} defaultOpen={open} />;
}

/** Every card folder that draws a warn marker, with its seeds and how a story draws them. */
const CARDS: Record<string, Card> = {
  alarm: card(ALARM_SEEDS, ALARM_WORST_CASE, (seed) => alarmSeverity(seed.entity), (seed, footprint, open, showControl) => <Alarm seed={seed} footprint={footprint} open={open} showControl={showControl} />),
  binarySensor: card(BINARY_SENSOR_SEEDS, BINARY_SENSOR_WORST_CASE, (seed) => binarySensorSeverity(seed.entity), (seed, footprint, open, showControl) => <DemoBinarySensorTile seed={seed} footprint={footprint} showControl={showControl} defaultOpen={open} />),
  cover: card(COVER_SEEDS, COVER_WORST_CASE, (seed) => coverSeverity(seed.entity), (seed, footprint, open, showControl) => <Cover seed={seed} footprint={footprint} open={open} showControl={showControl} />),
  dyson: card(DYSON_SEEDS, DYSON_WORST_CASE, (seed) => dysonSeverity(seed.entity), (seed, footprint, open, showControl) => <DemoDysonTile seed={seed} footprint={footprint} showControl={showControl} defaultOpen={open} />),
  lock: card(LOCK_SEEDS, LOCK_WORST_CASE, (seed) => lockSeverity(seed.entity), (seed, footprint, open, showControl) => <DemoLockTile seed={seed} footprint={footprint} showControl={showControl} defaultOpen={open} />),
  numeric: card(NUMERIC_SEEDS, NUMERIC_WORST_CASE, (seed) => numericSeverity(seed.entity), (seed, footprint, open, showControl) => <DemoNumericTile seed={seed} footprint={footprint} showControl={showControl} defaultOpen={open} />),
  owlet: card(OWLET_SEEDS, OWLET_WORST_CASE, (seed) => owletSeverity(seed.entity.alerts, owletStale(seed.entity)), (seed, footprint, open, showControl) => <DemoOwletTile seed={seed} footprint={footprint} showControl={showControl} defaultOpen={open} />),
  sensor: card(SENSOR_SEEDS, SENSOR_WORST_CASE, (seed) => sensorSeverity(seed.entity), (seed, footprint, open, showControl) => <SensorTile entity={seed.entity} history={seed.history} footprint={footprint} showControl={showControl} defaultOpen={open} />),
  vacuum: card(VACUUM_SEEDS, VACUUM_WORST_CASE, (seed) => vacuumSeverity(seed.entity), (seed, footprint, open, showControl) => <DemoVacuumTile seed={seed} footprint={footprint} showControl={showControl} defaultOpen={open} />),
  weather: card(WEATHER_SEEDS, WEATHER_WORST_CASE, (seed) => weatherSeverity(seed.entity), (seed, footprint, open, showControl) =>
    <WeatherTile entity={seed.entity} history={seed.history} hourly={seed.hourly} daily={seed.daily} footprint={footprint} showControl={showControl} defaultOpen={open} />),
};

const FOOTPRINTS: CardFootprint[] = ["compact", "standard", "featured"];
const dir = join(process.cwd(), "src/skins/orb/cards");

/** The card folders whose drawing (not their tests or stories) uses the warn marker. */
const drawsAlerts = readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name)
  .filter((name) => readdirSync(join(dir, name), { recursive: true, encoding: "utf8" })
    .filter((file) => /\.tsx?$/.test(file) && !/\.(test|stories)\.tsx?$/.test(file))
    .some((file) => /\bAlertStatus\b/.test(readFileSync(join(dir, name, file), "utf8"))));

/** The card folders whose drawing passes `CardFrame` a level. */
const drawsLevels = readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name)
  .filter((name) => readdirSync(join(dir, name), { recursive: true, encoding: "utf8" })
    .filter((file) => /\.tsx?$/.test(file) && !/\.(test|stories)\.tsx?$/.test(file))
    .some((file) => /\blevel=\{/.test(readFileSync(join(dir, name, file), "utf8"))));

/**
 * Every warn marker's label in the document, the sheet's among them. A marker hidden from screen readers repeats one
 * the same row already says (an urgent warning in a compact row's cue), so it has none.
 */
const labels = () => [...document.querySelectorAll(".hd-alert-cue:not([aria-hidden])")].map((cue) => cue.getAttribute("aria-label") ?? "");

afterEach(cleanup);

describe("Orb's warn marker names its card first", () => {
  it("holds every card that draws one", () => {
    expect(Object.keys(CARDS).sort()).toEqual([...drawsAlerts].sort());
  });

  for (const [name, { seeds, draw }] of Object.entries(CARDS)) {
    it(`${name}: Warning: <name>: …, or Alert: <name>: … for an alarm`, () => {
      const wrong: string[] = [];
      let found = 0;
      for (const seed of seeds) {
        const first = new RegExp(`^(?:Warning|Alert): ${seed.entity.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}: \\S`);
        for (const [footprint, open] of [...FOOTPRINTS.map((f) => [f, false] as const), ["standard", true] as const]) {
          render(<>{draw(seed as never, footprint, open)}</>);
          for (const label of labels()) {
            found += 1;
            if (!first.test(label)) wrong.push(`${seed.entity.name} (${open ? "sheet" : footprint}): ${label}`);
          }
          cleanup();
        }
      }
      expect(found, "no seed draws a warning").toBeGreaterThan(0);
      expect(wrong).toEqual([]);
    });
  }
});

describe("Orb's card says core's level, and a card with one never glows", () => {
  it("holds every card that passes the frame a level", () => {
    expect(drawsLevels.filter((name) => !(name in CARDS))).toEqual([]);
  });

  for (const [name, { seeds, draw, level }] of Object.entries(CARDS)) {
    it(`${name}: data-level is core's severity, and never beside data-glow`, () => {
      const wrong: string[] = [];
      const said = new Set<string>();
      for (const seed of seeds) {
        const expected = level(seed as never) ?? null;
        for (const [footprint, open] of [...FOOTPRINTS.map((f) => [f, false] as const), ["standard", true] as const]) {
          render(<>{draw(seed as never, footprint, open)}</>);
          const articles = [...document.querySelectorAll("article.hd")];
          if (!articles.length) wrong.push(`${seed.entity.name} (${open ? "sheet" : footprint}): no card drawn`);
          for (const article of articles) {
            const where = `${seed.entity.name} (${article.classList.contains("hd--sheet") ? "sheet" : footprint})`;
            const got = article.getAttribute("data-level");
            if (got) said.add(got);
            if (got !== expected) wrong.push(`${where}: data-level ${got} where core ranks ${expected}`);
            if (got && article.hasAttribute("data-glow")) wrong.push(`${where}: glows with a level (${got})`);
          }
          cleanup();
        }
      }
      expect(said.size, "no seed draws a level").toBeGreaterThan(0);
      expect(wrong).toEqual([]);
    });
  }
});

describe("Orb draws urgent apart from advisory by shape, not by ink", () => {
  for (const [name, { seeds, draw, level }] of Object.entries(CARDS)) {
    it(`${name}: an urgent marker is solid, an advisory one outlined, and urgent takes a value row's cue`, () => {
      const wrong: string[] = [];
      for (const seed of seeds) {
        const expected = level(seed as never);
        const drawings = [
          ...FOOTPRINTS.map((footprint) => [footprint, false, undefined] as const),
          ["compact", false, false] as const,
          ["standard", true, undefined] as const,
        ];
        for (const [footprint, open, showControl] of drawings) {
          render(<>{draw(seed as never, footprint, open, showControl)}</>);
          for (const article of document.querySelectorAll<HTMLElement>("article.hd")) {
            const sheet = article.classList.contains("hd--sheet");
            const where = `${seed.entity.name} (${sheet ? "sheet" : `${footprint}${showControl === false ? ", no control" : ""}`})`;
            const status = [...article.querySelectorAll(".hd-area .hd-alert-cue")];
            const solid = article.querySelectorAll('.hd-alert-cue[data-level="urgent"]').length;
            if (expected === "urgent" && status.some((cue) => cue.getAttribute("data-level") !== "urgent")) wrong.push(`${where}: an urgent status line's marker isn't solid`);
            if (expected === "advisory" && solid) wrong.push(`${where}: an advisory card draws a solid marker`);

            const cue = article.querySelector(".hd-slot .hd-alert-cue");
            const valueRow = footprint === "compact" && !sheet && (showControl === false || article.dataset.role === "reading");
            const takes = expected === "urgent" && valueRow && article.dataset.state !== "unavailable";
            if (takes && cue?.getAttribute("data-level") !== "urgent") wrong.push(`${where}: an urgent warning doesn't take the row's cue`);
            if (takes && cue?.getAttribute("aria-hidden") !== "true") wrong.push(`${where}: the row's cue says the warning a second time`);
            if (!takes && cue) wrong.push(`${where}: the slot draws a marker`);
          }
          cleanup();
        }
      }
      expect(wrong).toEqual([]);
    });
  }
});
