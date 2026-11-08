/**
 * An Orb warning names its card first (spec/orb.md → One palette, Warn orange): every warn marker a card draws
 * (`AlertStatus`, whose cue is `.hd-alert-cue`) is labelled `Warning: <name>: <what>`, or `Alert: <name>: <what>` for an
 * alarm, so a screen reader moving through a page of cards hears whose warning it is before what it says.
 *
 * This draws every seed of every card that draws one, its demo seeds and its worst case, in each footprint and in its
 * sheet, and holds every label it finds. A card folder whose drawing uses `AlertStatus` and isn't listed here fails, so a
 * new card's warning is held as soon as it draws one.
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

type Draw<S> = (seed: S, footprint: CardFootprint, open: boolean) => ReactNode;
interface Card { seeds: readonly { entity: { name: string } }[]; draw: Draw<never> }
const card = <S extends { entity: { name: string } }>(seeds: Readonly<Record<string, NoInfer<S>>>, worst: readonly S[], draw: Draw<S>): Card =>
  ({ seeds: [...Object.values(seeds), ...worst], draw: draw as Draw<never> });

function Alarm({ seed, footprint, open }: { seed: AlarmSeed; footprint: CardFootprint; open: boolean }) {
  return <AlarmTile {...useDemoAlarm(seed)} footprint={footprint} defaultOpen={open} readOnly={seed.readOnly} />;
}

function Cover({ seed, footprint, open }: { seed: CoverSeed; footprint: CardFootprint; open: boolean }) {
  return <CoverTile {...useDemoCover(seed)} footprint={footprint} defaultOpen={open} />;
}

/** Every card folder that draws a warn marker, with its seeds and how a story draws them. */
const CARDS: Record<string, Card> = {
  alarm: card(ALARM_SEEDS, ALARM_WORST_CASE, (seed, footprint, open) => <Alarm seed={seed} footprint={footprint} open={open} />),
  binarySensor: card(BINARY_SENSOR_SEEDS, BINARY_SENSOR_WORST_CASE, (seed, footprint, open) => <DemoBinarySensorTile seed={seed} footprint={footprint} defaultOpen={open} />),
  cover: card(COVER_SEEDS, COVER_WORST_CASE, (seed, footprint, open) => <Cover seed={seed} footprint={footprint} open={open} />),
  lock: card(LOCK_SEEDS, LOCK_WORST_CASE, (seed, footprint, open) => <DemoLockTile seed={seed} footprint={footprint} defaultOpen={open} />),
  numeric: card(NUMERIC_SEEDS, NUMERIC_WORST_CASE, (seed, footprint, open) => <DemoNumericTile seed={seed} footprint={footprint} defaultOpen={open} />),
  owlet: card(OWLET_SEEDS, OWLET_WORST_CASE, (seed, footprint, open) => <DemoOwletTile seed={seed} footprint={footprint} defaultOpen={open} />),
  sensor: card(SENSOR_SEEDS, SENSOR_WORST_CASE, (seed, footprint, open) => <SensorTile entity={seed.entity} history={seed.history} footprint={footprint} defaultOpen={open} />),
  vacuum: card(VACUUM_SEEDS, VACUUM_WORST_CASE, (seed, footprint, open) => <DemoVacuumTile seed={seed} footprint={footprint} defaultOpen={open} />),
  weather: card(WEATHER_SEEDS, WEATHER_WORST_CASE, (seed, footprint, open) =>
    <WeatherTile entity={seed.entity} history={seed.history} hourly={seed.hourly} daily={seed.daily} footprint={footprint} defaultOpen={open} />),
};

const FOOTPRINTS: CardFootprint[] = ["compact", "standard", "featured"];
const dir = join(process.cwd(), "src/skins/orb/cards");

/** The card folders whose drawing (not their tests or stories) uses the warn marker. */
const drawsAlerts = readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name)
  .filter((name) => readdirSync(join(dir, name), { recursive: true, encoding: "utf8" })
    .filter((file) => /\.tsx?$/.test(file) && !/\.(test|stories)\.tsx?$/.test(file))
    .some((file) => /\bAlertStatus\b/.test(readFileSync(join(dir, name, file), "utf8"))));

/** Every warn marker's label in the document, the sheet's among them. */
const labels = () => [...document.querySelectorAll(".hd-alert-cue")].map((cue) => cue.getAttribute("aria-label") ?? "");

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
