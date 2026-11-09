import { useState } from "react";
import type { ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import type { FieldFootprint } from "../shared/ui";
import { DataToggle } from "../../../../.storybook/blocks/DataToggle";
import type { Data } from "../../../../.storybook/blocks/DataToggle";
import { LightModule } from "../cards/light/LightModule";
import { LIGHT_SEEDS, LIGHT_WORST_CASE, useDemoLight } from "@dashhaus/core/seeds/light";
import type { LightSeed } from "@dashhaus/core/seeds/light";
import { ClimateModule } from "../cards/climate/ClimateModule";
import { CLIMATE_SEEDS, CLIMATE_WORST_CASE, useDemoClimate } from "@dashhaus/core/seeds/climate";
import type { ClimateSeed } from "@dashhaus/core/seeds/climate";
import { WeatherModule } from "../cards/weather/WeatherModule";
import { WEATHER_SEEDS, WEATHER_WORST_CASE } from "@dashhaus/core/seeds/weather";
import { AlarmModule } from "../cards/alarm/AlarmModule";
import { ALARM_SEEDS, ALARM_WORST_CASE, useDemoAlarm } from "@dashhaus/core/seeds/alarm";
import type { AlarmSeed } from "@dashhaus/core/seeds/alarm";
import { LockModule } from "../cards/lock/LockModule";
import { LOCK_SEEDS, LOCK_WORST_CASE, useDemoLock } from "@dashhaus/core/seeds/lock";
import type { LockSeed } from "@dashhaus/core/seeds/lock";
import { CoverModule } from "../cards/cover/CoverModule";
import { COVER_SEEDS, COVER_WORST_CASE, useDemoCover } from "@dashhaus/core/seeds/cover";
import type { CoverSeed } from "@dashhaus/core/seeds/cover";
import { ToggleModule } from "../cards/toggle/ToggleModule";
import { TOGGLE_SEEDS, TOGGLE_WORST_CASE, useDemoToggle } from "@dashhaus/core/seeds/toggle";
import type { ToggleSeed } from "@dashhaus/core/seeds/toggle";
import { SensorModule } from "../cards/sensor/SensorModule";
import { SENSOR_SEEDS, SENSOR_WORST_CASE } from "@dashhaus/core/seeds/sensor";
import { HumidifierModule } from "../cards/humidifier/HumidifierModule";
import { HUMIDIFIER_SEEDS, HUMIDIFIER_WORST_CASE, useDemoHumidifier } from "@dashhaus/core/seeds/humidifier";
import type { HumidifierSeed } from "@dashhaus/core/seeds/humidifier";
import { SoundModule } from "../cards/sound/SoundModule";
import { SOUND_SEEDS, SOUND_WORST_CASE, useDemoSound } from "@dashhaus/core/seeds/sound";
import type { SoundSeed } from "@dashhaus/core/seeds/sound";
import { FanModule } from "../cards/fan/FanModule";
import { FAN_SEEDS, FAN_WORST_CASE, useDemoFan } from "@dashhaus/core/seeds/fan";
import type { FanSeed } from "@dashhaus/core/seeds/fan";
import { OwletModule } from "../cards/owlet/OwletModule";
import { OWLET_SEEDS, OWLET_WORST_CASE } from "@dashhaus/core/seeds/owlet";
import type { OwletSeed } from "@dashhaus/core/seeds/owlet";
import { CameraModule } from "../cards/camera/CameraModule";
import { CAMERA_SEEDS, CAMERA_WORST_CASE } from "@dashhaus/core/seeds/camera";
import { GuestWifiModule } from "../cards/guestWifi/GuestWifiModule";
import { GUEST_WIFI_SEEDS, GUEST_WIFI_WORST_CASE, useDemoGuestWifi } from "@dashhaus/core/seeds/guestWifi";
import type { GuestWifiSeed } from "@dashhaus/core/seeds/guestWifi";
import { BinarySensorModule } from "../cards/binarySensor/BinarySensorModule";
import { BINARY_SENSOR_SEEDS, BINARY_SENSOR_WORST_CASE, useDemoBinarySensor } from "@dashhaus/core/seeds/binarySensor";
import type { BinarySensorSeed } from "@dashhaus/core/seeds/binarySensor";
import { MediaPlayerModule } from "../cards/mediaPlayer/MediaPlayerModule";
import { MEDIA_PLAYER_SEEDS, MEDIA_PLAYER_WORST_CASE, useDemoMediaPlayer } from "@dashhaus/core/seeds/mediaPlayer";
import type { MediaPlayerSeed } from "@dashhaus/core/seeds/mediaPlayer";
import { NumericModule } from "../cards/numeric/NumericModule";
import { NUMERIC_SEEDS, NUMERIC_WORST_CASE } from "@dashhaus/core/seeds/numeric";
import { VacuumModule } from "../cards/vacuum/VacuumModule";
import { VACUUM_SEEDS, VACUUM_WORST_CASE, useDemoVacuum } from "@dashhaus/core/seeds/vacuum";
import type { VacuumSeed } from "@dashhaus/core/seeds/vacuum";
import { CalendarModule } from "../cards/calendar/CalendarModule";
import { CALENDAR_SEEDS, CALENDAR_WORST_CASE } from "@dashhaus/core/seeds/calendar";
import { SunModule } from "../cards/sun/SunModule";
import { SUN_SEEDS, SUN_WORST_CASE } from "@dashhaus/core/seeds/sun";
import { DysonModule } from "../cards/dyson/DysonModule";
import { DYSON_SEEDS, DYSON_WORST_CASE, useDemoDyson } from "@dashhaus/core/seeds/dyson";
import type { DysonSeed } from "@dashhaus/core/seeds/dyson";
// new-card: worst case imports

/*
 * Worst-case data: values real Home Assistant installs produce, not random strings. Each module keeps its own in the
 * domain's seeds in @dashhaus/core (`<NAME>_WORST_CASE`, every skin's), which its Worst case story also draws; this
 * page runs them all side by side, as Orb's does, and verify/storybook.test.ts fails while a module's are missing.
 */

// The modules on their demo state, so a press on the page answers as it does in the module's own stories.
function Light({ seed, footprint }: { seed: LightSeed; footprint: FieldFootprint }) {
  return <LightModule {...useDemoLight(seed)} footprint={footprint} />;
}

function Climate({ seed, footprint }: { seed: ClimateSeed; footprint: FieldFootprint }) {
  return <ClimateModule {...useDemoClimate(seed)} footprint={footprint} />;
}

function Alarm({ seed, footprint }: { seed: AlarmSeed; footprint: FieldFootprint }) {
  const demo = useDemoAlarm(seed);
  return <AlarmModule entity={demo.entity} history={demo.history} onArm={seed.readOnly ? undefined : demo.onArm} onDisarm={seed.readOnly ? undefined : demo.onDisarm} footprint={footprint} />;
}

function Lock({ seed, footprint }: { seed: LockSeed; footprint: FieldFootprint }) {
  return <LockModule {...useDemoLock(seed)} footprint={footprint} />;
}

function Cover({ seed, footprint }: { seed: CoverSeed; footprint: FieldFootprint }) {
  return <CoverModule {...useDemoCover(seed)} footprint={footprint} />;
}

function Toggle({ seed, footprint }: { seed: ToggleSeed; footprint: FieldFootprint }) {
  return <ToggleModule {...useDemoToggle(seed)} footprint={footprint} />;
}

function Humidifier({ seed, footprint }: { seed: HumidifierSeed; footprint: FieldFootprint }) {
  return <HumidifierModule {...useDemoHumidifier(seed)} footprint={footprint} />;
}

function Sound({ seed, footprint }: { seed: SoundSeed; footprint: FieldFootprint }) {
  return <SoundModule {...useDemoSound(seed)} footprint={footprint} />;
}

function Fan({ seed, footprint }: { seed: FanSeed; footprint: FieldFootprint }) {
  return <FanModule {...useDemoFan(seed)} footprint={footprint} />;
}

/** Its base station switches locally, as in the module's own stories. */
function Owlet({ seed, footprint }: { seed: OwletSeed; footprint: FieldFootprint }) {
  const [baseOn, setBaseOn] = useState(seed.entity.baseOn ?? true);
  return <OwletModule entity={{ ...seed.entity, baseOn }} history={seed.history} footprint={footprint} onBaseToggle={() => setBaseOn((on) => !on)} />;
}

function GuestWifi({ seed, footprint }: { seed: GuestWifiSeed; footprint: FieldFootprint }) {
  return <GuestWifiModule {...useDemoGuestWifi(seed)} footprint={footprint} />;
}

function BinarySensor({ seed, footprint }: { seed: BinarySensorSeed; footprint: FieldFootprint }) {
  const demo = useDemoBinarySensor(seed);
  return <BinarySensorModule entity={demo.entity} history={demo.history} footprint={footprint} />;
}

function MediaPlayer({ seed, footprint }: { seed: MediaPlayerSeed; footprint: FieldFootprint }) {
  return <MediaPlayerModule {...useDemoMediaPlayer(seed)} footprint={footprint} />;
}

function Vacuum({ seed, footprint }: { seed: VacuumSeed; footprint: FieldFootprint }) {
  return <VacuumModule {...useDemoVacuum(seed)} footprint={footprint} />;
}

function Dyson({ seed, footprint }: { seed: DysonSeed; footprint: FieldFootprint }) {
  return <DysonModule {...useDemoDyson(seed)} footprint={footprint} />;
}
// new-card: worst case modules

/** One row of the page: a seed drawn in a footprint. */
type Draw = (footprint: FieldFootprint) => ReactNode;

/** A module on the page: a row per seed, its worst case and a little demo data to hold it against. */
function card<S>(worst: readonly S[], demo: readonly S[], draw: (seed: S, footprint: FieldFootprint) => ReactNode): Record<Data, Draw[]> {
  const rows = (seeds: readonly S[]) => seeds.map((seed): Draw => (footprint) => draw(seed, footprint));
  return { worst: rows(worst), demo: rows(demo) };
}

/** Every module, in the order Orb's page draws its cards, so the two pages read alike; a new module joins the end. */
const CARDS = [
  card(LIGHT_WORST_CASE, [LIGHT_SEEDS.dimmable, LIGHT_SEEDS.onOff], (seed, footprint) => <Light seed={seed} footprint={footprint} />),
  card(CLIMATE_WORST_CASE, [CLIMATE_SEEDS.heating, CLIMATE_SEEDS.range], (seed, footprint) => <Climate seed={seed} footprint={footprint} />),
  card(WEATHER_WORST_CASE, [WEATHER_SEEDS.partly], (seed, footprint) => <WeatherModule entity={seed.entity} history={seed.history} hourly={seed.hourly} daily={seed.daily} footprint={footprint} />),
  card(ALARM_WORST_CASE, [ALARM_SEEDS.away], (seed, footprint) => <Alarm seed={seed} footprint={footprint} />),
  card(LOCK_WORST_CASE, [LOCK_SEEDS.locked], (seed, footprint) => <Lock seed={seed} footprint={footprint} />),
  card(COVER_WORST_CASE, [COVER_SEEDS.curtains, COVER_SEEDS.garage], (seed, footprint) => <Cover seed={seed} footprint={footprint} />),
  card(TOGGLE_WORST_CASE, [TOGGLE_SEEDS.dnd], (seed, footprint) => <Toggle seed={seed} footprint={footprint} />),
  card(SENSOR_WORST_CASE, [SENSOR_SEEDS.living, SENSOR_SEEDS.outdoor], (seed, footprint) => <SensorModule entity={seed.entity} history={seed.history} footprint={footprint} />),
  card(HUMIDIFIER_WORST_CASE, [HUMIDIFIER_SEEDS.on], (seed, footprint) => <Humidifier seed={seed} footprint={footprint} />),
  card(SOUND_WORST_CASE, [SOUND_SEEDS.on], (seed, footprint) => <Sound seed={seed} footprint={footprint} />),
  card(FAN_WORST_CASE, [FAN_SEEDS.on], (seed, footprint) => <Fan seed={seed} footprint={footprint} />),
  card(OWLET_WORST_CASE, [OWLET_SEEDS.deep], (seed, footprint) => <Owlet seed={seed} footprint={footprint} />),
  card(CAMERA_WORST_CASE, [CAMERA_SEEDS.idle], (seed, footprint) => <CameraModule entity={seed.entity} footprint={footprint} />),
  card(GUEST_WIFI_WORST_CASE, [GUEST_WIFI_SEEDS.ready], (seed, footprint) => <GuestWifi seed={seed} footprint={footprint} />),
  card(BINARY_SENSOR_WORST_CASE, [BINARY_SENSOR_SEEDS.closed, BINARY_SENSOR_SEEDS.open], (seed, footprint) => <BinarySensor seed={seed} footprint={footprint} />),
  card(MEDIA_PLAYER_WORST_CASE, [MEDIA_PLAYER_SEEDS.playing], (seed, footprint) => <MediaPlayer seed={seed} footprint={footprint} />),
  card(NUMERIC_WORST_CASE, [NUMERIC_SEEDS.co2, NUMERIC_SEEDS.power], (seed, footprint) => <NumericModule entity={seed.entity} history={seed.history} footprint={footprint} />),
  card(VACUUM_WORST_CASE, [VACUUM_SEEDS.cleaning], (seed, footprint) => <Vacuum seed={seed} footprint={footprint} />),
  card(CALENDAR_WORST_CASE, [CALENDAR_SEEDS.normal], (seed, footprint) => <CalendarModule entity={seed.entity} history={seed.history} footprint={footprint} />),
  card(SUN_WORST_CASE, [SUN_SEEDS.normal], (seed, footprint) => <SunModule entity={seed.entity} history={seed.history} footprint={footprint} />),
  card(DYSON_WORST_CASE, [DYSON_SEEDS.on], (seed, footprint) => <Dyson seed={seed} footprint={footprint} />),
  // new-card: worst cases
];

/**
 * Field's widths and its two footprints (spec/field.md → Footprints): a module under 266 px, where its pictogram goes,
 * one at 266 px, the narrowest that keeps everything, one at an area's usual width and a wide one; a row under 300 px,
 * where its screen narrows, one at 300 px, the narrowest with its whole screen, and one at its usual width.
 */
const CASES: { width: number; footprint: FieldFootprint }[] = [
  { width: 200, footprint: "standard" },
  { width: 266, footprint: "standard" },
  { width: 300, footprint: "standard" },
  { width: 464, footprint: "standard" },
  { width: 260, footprint: "compact" },
  { width: 300, footprint: "compact" },
  { width: 340, footprint: "compact" },
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
  title: "Field/Foundations/Worst case",
  parameters: { layout: "padded" },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

/** Every module against realistic worst-case data, at narrow, boundary, track and wide standard widths and narrow, boundary and track rows. */
export const AllCards: Story = { render: () => <WorstCasePage /> };
