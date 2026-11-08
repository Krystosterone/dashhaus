import type { CardFootprint } from "../shared/ui";
import { useState } from "react";
import type { ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { DataToggle } from "../../../../.storybook/blocks/DataToggle";
import type { Data } from "../../../../.storybook/blocks/DataToggle";
import { LightTile } from "../cards/light/LightTile";
import { LIGHT_WORST_CASE, LIGHT_SEEDS, useDemoLight } from "@dashhaus/core/seeds/light";
import type { LightSeed } from "@dashhaus/core/seeds/light";
import { ClimateTile } from "../cards/climate/ClimateTile";
import { CLIMATE_SEEDS, CLIMATE_WORST_CASE, useDemoClimate } from "@dashhaus/core/seeds/climate";
import type { ClimateSeed } from "@dashhaus/core/seeds/climate";
import { SensorTile } from "../cards/sensor/SensorTile";
import { SENSOR_SEEDS, SENSOR_WORST_CASE } from "@dashhaus/core/seeds/sensor";
import { WeatherTile } from "../cards/weather/WeatherTile";
import { WEATHER_SEEDS, WEATHER_WORST_CASE } from "@dashhaus/core/seeds/weather";
import { ToggleTile } from "../cards/toggle/ToggleTile";
import { TOGGLE_SEEDS, TOGGLE_WORST_CASE, useDemoToggle } from "@dashhaus/core/seeds/toggle";
import type { ToggleSeed } from "@dashhaus/core/seeds/toggle";
import { CoverTile } from "../cards/cover/CoverTile";
import { COVER_SEEDS, COVER_WORST_CASE, useDemoCover } from "@dashhaus/core/seeds/cover";
import type { CoverSeed } from "@dashhaus/core/seeds/cover";
import { AlarmTile } from "../cards/alarm/AlarmTile";
import { ALARM_SEEDS, ALARM_WORST_CASE, useDemoAlarm } from "@dashhaus/core/seeds/alarm";
import type { AlarmSeed } from "@dashhaus/core/seeds/alarm";
import { DemoHumidifierTile } from "../cards/humidifier/demo/DemoHumidifierTile";
import { HUMIDIFIER_SEEDS, HUMIDIFIER_WORST_CASE } from "@dashhaus/core/seeds/humidifier";
import { DemoOwletTile } from "../cards/owlet/demo/DemoOwletTile";
import { OWLET_SEEDS, OWLET_WORST_CASE } from "@dashhaus/core/seeds/owlet";
import { DemoSoundTile } from "../cards/sound/demo/DemoSoundTile";
import { SOUND_SEEDS, SOUND_WORST_CASE } from "@dashhaus/core/seeds/sound";
import { DemoLockTile } from "../cards/lock/demo/DemoLockTile";
import { LOCK_SEEDS, LOCK_WORST_CASE } from "@dashhaus/core/seeds/lock";
import { DemoFanTile } from "../cards/fan/demo/DemoFanTile";
import { FAN_SEEDS, FAN_WORST_CASE } from "@dashhaus/core/seeds/fan";
import { DemoCameraTile } from "../cards/camera/demo/DemoCameraTile";
import { CAMERA_SEEDS, CAMERA_WORST_CASE } from "@dashhaus/core/seeds/camera";
import { DemoGuestWifiTile } from "../cards/guestWifi/demo/DemoGuestWifiTile";
import { GUEST_WIFI_SEEDS, GUEST_WIFI_WORST_CASE } from "@dashhaus/core/seeds/guestWifi";
import { DemoBinarySensorTile } from "../cards/binarySensor/demo/DemoBinarySensorTile";
import { BINARY_SENSOR_SEEDS, BINARY_SENSOR_WORST_CASE } from "@dashhaus/core/seeds/binarySensor";
import { DemoMediaPlayerTile } from "../cards/mediaPlayer/demo/DemoMediaPlayerTile";
import { MEDIA_PLAYER_SEEDS, MEDIA_PLAYER_WORST_CASE } from "@dashhaus/core/seeds/mediaPlayer";
import { DemoNumericTile } from "../cards/numeric/demo/DemoNumericTile";
import { NUMERIC_SEEDS, NUMERIC_WORST_CASE } from "@dashhaus/core/seeds/numeric";
import { DemoVacuumTile } from "../cards/vacuum/demo/DemoVacuumTile";
import { VACUUM_SEEDS, VACUUM_WORST_CASE } from "@dashhaus/core/seeds/vacuum";
import { DemoCalendarTile } from "../cards/calendar/demo/DemoCalendarTile";
import { CALENDAR_SEEDS, CALENDAR_WORST_CASE } from "@dashhaus/core/seeds/calendar";
import { DemoSunTile } from "../cards/sun/demo/DemoSunTile";
import { SUN_SEEDS, SUN_WORST_CASE } from "@dashhaus/core/seeds/sun";
// new-card: worst case imports

/*
 * Worst-case data: values real Home Assistant installs produce, not random strings. Each card keeps its own in its
 * demo seeds (`<NAME>_WORST_CASE`), which its Worst case story also draws; this page runs them all side by side, and
 * verify/storybook.test.ts fails while a card's are missing from it.
 */

function Light({ seed, footprint }: { seed: LightSeed; footprint: CardFootprint }) {
  const demo = useDemoLight(seed);
  return <LightTile {...demo} footprint={footprint} />;
}

function Climate({ seed, footprint }: { seed: ClimateSeed; footprint: CardFootprint }) {
  const demo = useDemoClimate(seed);
  return <ClimateTile {...demo} footprint={footprint} />;
}

function Alarm({ seed, footprint }: { seed: AlarmSeed; footprint: CardFootprint }) {
  const demo = useDemoAlarm(seed);
  return <AlarmTile {...demo} footprint={footprint} />;
}

function Cover({ seed, footprint }: { seed: CoverSeed; footprint: CardFootprint }) {
  const demo = useDemoCover(seed);
  return <CoverTile {...demo} footprint={footprint} />;
}

function Toggle({ seed, footprint }: { seed: ToggleSeed; footprint: CardFootprint }) {
  const demo = useDemoToggle(seed);
  return <ToggleTile {...demo} footprint={footprint} />;
}

/** One row of the page: a seed drawn in a footprint. */
type Draw = (footprint: CardFootprint) => ReactNode;

/** A card on the page: a row per seed, its worst case and a little demo data to hold it against. */
function card<S>(worst: readonly S[], demo: readonly S[], draw: (seed: S, footprint: CardFootprint) => ReactNode): Record<Data, Draw[]> {
  const rows = (seeds: readonly S[]) => seeds.map((seed): Draw => (footprint) => draw(seed, footprint));
  return { worst: rows(worst), demo: rows(demo) };
}

/** Every card, in the order the page has always drawn them; a new card joins the end. */
const CARDS = [
  card(LIGHT_WORST_CASE, [LIGHT_SEEDS.dimmable, LIGHT_SEEDS.onOff], (seed, footprint) => <Light seed={seed} footprint={footprint} />),
  card(CLIMATE_WORST_CASE, [CLIMATE_SEEDS.heating, CLIMATE_SEEDS.range], (seed, footprint) => <Climate seed={seed} footprint={footprint} />),
  card(WEATHER_WORST_CASE, [WEATHER_SEEDS.partly], (seed, footprint) => <WeatherTile entity={seed.entity} history={seed.history} hourly={seed.hourly} daily={seed.daily} footprint={footprint} />),
  card(ALARM_WORST_CASE, [ALARM_SEEDS.away], (seed, footprint) => <Alarm seed={seed} footprint={footprint} />),
  card(LOCK_WORST_CASE, [LOCK_SEEDS.locked], (seed, footprint) => <DemoLockTile seed={seed} footprint={footprint} />),
  card(COVER_WORST_CASE, [COVER_SEEDS.curtains, COVER_SEEDS.garage], (seed, footprint) => <Cover seed={seed} footprint={footprint} />),
  card(TOGGLE_WORST_CASE, [TOGGLE_SEEDS.dnd], (seed, footprint) => <Toggle seed={seed} footprint={footprint} />),
  card(SENSOR_WORST_CASE, [SENSOR_SEEDS.living, SENSOR_SEEDS.outdoor], (seed, footprint) => <SensorTile entity={seed.entity} history={seed.history} footprint={footprint} />),
  card(HUMIDIFIER_WORST_CASE, [HUMIDIFIER_SEEDS.on], (seed, footprint) => <DemoHumidifierTile seed={seed} footprint={footprint} />),
  card(SOUND_WORST_CASE, [SOUND_SEEDS.on], (seed, footprint) => <DemoSoundTile seed={seed} footprint={footprint} />),
  card(FAN_WORST_CASE, [FAN_SEEDS.on], (seed, footprint) => <DemoFanTile seed={seed} footprint={footprint} />),
  card(OWLET_WORST_CASE, [OWLET_SEEDS.deep], (seed, footprint) => <DemoOwletTile seed={seed} footprint={footprint} />),
  card(CAMERA_WORST_CASE, [CAMERA_SEEDS.idle], (seed, footprint) => <DemoCameraTile seed={seed} footprint={footprint} />),
  card(GUEST_WIFI_WORST_CASE, [GUEST_WIFI_SEEDS.ready], (seed, footprint) => <DemoGuestWifiTile seed={seed} footprint={footprint} />),
  card(BINARY_SENSOR_WORST_CASE, [BINARY_SENSOR_SEEDS.closed, BINARY_SENSOR_SEEDS.open], (seed, footprint) => <DemoBinarySensorTile seed={seed} footprint={footprint} />),
  card(MEDIA_PLAYER_WORST_CASE, [MEDIA_PLAYER_SEEDS.playing], (seed, footprint) => <DemoMediaPlayerTile seed={seed} footprint={footprint} />),
  card(NUMERIC_WORST_CASE, [NUMERIC_SEEDS.co2, NUMERIC_SEEDS.power], (seed, footprint) => <DemoNumericTile seed={seed} footprint={footprint} />),
  card(VACUUM_WORST_CASE, [VACUUM_SEEDS.cleaning], (seed, footprint) => <DemoVacuumTile seed={seed} footprint={footprint} />),
  card(CALENDAR_WORST_CASE, [CALENDAR_SEEDS.normal], (seed, footprint) => <DemoCalendarTile seed={seed} footprint={footprint} />),
  card(SUN_WORST_CASE, [SUN_SEEDS.normal], (seed, footprint) => <DemoSunTile seed={seed} footprint={footprint} />),
  // new-card: worst cases
];

/** Width and footprint are independent: wide standard stays standard; featured is always explicit. */
const CASES: { width: number; footprint: CardFootprint }[] = [
  { width: 170, footprint: "standard" },
  { width: 320, footprint: "standard" },
  { width: 480, footprint: "standard" },
  { width: 320, footprint: "featured" },
  { width: 300, footprint: "compact" },
];

function Row({ children }: { children: Draw }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", gap: 12 }}>
      {CASES.map(({ width, footprint }) => <div key={`${width}-${footprint}`} style={{ width, maxWidth: "100%" }}>{children(footprint)}</div>)}
    </div>
  );
}

function WorstCasePage() {
  const [data, setData] = useState<Data>("worst");
  return (
    <div key={data} style={{ display: "grid", gap: 12, paddingBottom: 72 }}>
      {CARDS.flatMap((rows, c) => rows[data].map((draw, s) => <Row key={`${c}-${s}`}>{draw}</Row>))}
      <DataToggle value={data} onChange={setData} />
    </div>
  );
}

const meta = {
  title: "Orb/Foundations/Worst case",
  parameters: { layout: "padded" },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

/** Every card against realistic worst-case data at narrow/wide standard, featured, and compact footprints. */
export const AllCards: Story = { render: () => <WorstCasePage /> };
