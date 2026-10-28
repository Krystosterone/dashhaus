import type { CardFootprint } from "../shared/ui";
import { useState } from "react";
import type { ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { LightTile } from "../cards/light/LightTile";
import { LIGHT_WORST_CASE, SEEDS, useDemoLight } from "../cards/light/demo/useDemoLight";
import type { DemoSeed } from "../cards/light/demo/useDemoLight";
import { ClimateTile } from "../cards/climate/ClimateTile";
import { CLIMATE_SEEDS, CLIMATE_WORST_CASE, useDemoClimate } from "../cards/climate/demo/useDemoClimate";
import type { ClimateSeed } from "../cards/climate/demo/useDemoClimate";
import { SensorTile } from "../cards/sensor/SensorTile";
import { SENSOR_SEEDS, SENSOR_WORST_CASE } from "../cards/sensor/demo/sensors";
import type { SensorSeed } from "../cards/sensor/demo/sensors";
import { WeatherTile } from "../cards/weather/WeatherTile";
import { WEATHER_SEEDS, WEATHER_WORST_CASE } from "../cards/weather/demo/weather";
import type { WeatherSeed } from "../cards/weather/demo/weather";
import { ToggleTile } from "../cards/toggle/ToggleTile";
import { TOGGLE_SEEDS, TOGGLE_WORST_CASE, useDemoToggle } from "../cards/toggle/demo/useDemoToggle";
import type { ToggleSeed } from "../cards/toggle/demo/useDemoToggle";
import { CoverTile } from "../cards/cover/CoverTile";
import { COVER_SEEDS, COVER_WORST_CASE, useDemoCover } from "../cards/cover/demo/useDemoCover";
import type { CoverSeed } from "../cards/cover/demo/useDemoCover";
import { AlarmTile } from "../cards/alarm/AlarmTile";
import { ALARM_SEEDS, ALARM_WORST_CASE, useDemoAlarm } from "../cards/alarm/demo/useDemoAlarm";
import type { AlarmSeed } from "../cards/alarm/demo/useDemoAlarm";
import { DemoHumidifierTile } from "../cards/humidifier/demo/DemoHumidifierTile";
import { HUMIDIFIER_SEEDS, HUMIDIFIER_WORST_CASE } from "../cards/humidifier/demo/useDemoHumidifier";
import type { HumidifierSeed } from "../cards/humidifier/demo/useDemoHumidifier";
import { DemoOwletTile } from "../cards/owlet/demo/DemoOwletTile";
import { OWLET_SEEDS, OWLET_WORST_CASE } from "../cards/owlet/demo/socks";
import type { OwletSeed } from "../cards/owlet/demo/socks";
import { DemoSoundTile } from "../cards/sound/demo/DemoSoundTile";
import { SOUND_SEEDS, SOUND_WORST_CASE } from "../cards/sound/demo/useDemoSound";
import type { SoundSeed } from "../cards/sound/demo/useDemoSound";

/*
 * Worst-case data: values real Home Assistant installs produce, not random strings. Each card keeps its own in its
 * demo seeds (`<NAME>_WORST_CASE`), which its Worst case story also draws; this page runs them all side by side.
 */

const LIGHTS: Record<"demo" | "worst", DemoSeed[]> = {
  demo: [SEEDS.dimmable, SEEDS.onOff],
  worst: LIGHT_WORST_CASE,
};

const CLIMATES: Record<"demo" | "worst", ClimateSeed[]> = {
  demo: [CLIMATE_SEEDS.heating, CLIMATE_SEEDS.range],
  worst: CLIMATE_WORST_CASE,
};

const SENSORS: Record<"demo" | "worst", SensorSeed[]> = {
  demo: [SENSOR_SEEDS.living, SENSOR_SEEDS.outdoor],
  worst: SENSOR_WORST_CASE,
};

const WEATHERS: Record<"demo" | "worst", WeatherSeed[]> = {
  demo: [WEATHER_SEEDS.partly],
  worst: WEATHER_WORST_CASE,
};

const TOGGLES: Record<"demo" | "worst", ToggleSeed[]> = {
  demo: [TOGGLE_SEEDS.dnd],
  worst: TOGGLE_WORST_CASE,
};

const COVERS: Record<"demo" | "worst", CoverSeed[]> = {
  demo: [COVER_SEEDS.curtains, COVER_SEEDS.garage],
  worst: COVER_WORST_CASE,
};

const ALARMS: Record<"demo" | "worst", AlarmSeed[]> = {
  demo: [ALARM_SEEDS.away],
  worst: ALARM_WORST_CASE,
};

const HUMIDIFIERS: Record<"demo" | "worst", HumidifierSeed[]> = {
  demo: [HUMIDIFIER_SEEDS.on],
  worst: HUMIDIFIER_WORST_CASE,
};

const OWLETS: Record<"demo" | "worst", OwletSeed[]> = {
  demo: [OWLET_SEEDS.deep],
  worst: OWLET_WORST_CASE,
};

const SOUNDS: Record<"demo" | "worst", SoundSeed[]> = {
  demo: [SOUND_SEEDS.on],
  worst: SOUND_WORST_CASE,
};

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

/** Width and footprint are independent: wide standard stays standard; featured is always explicit. */
const CASES: { width: number; footprint: CardFootprint }[] = [
  { width: 170, footprint: "standard" },
  { width: 320, footprint: "standard" },
  { width: 480, footprint: "standard" },
  { width: 320, footprint: "featured" },
  { width: 300, footprint: "compact" },
];

function Row({ children }: { children: (footprint: CardFootprint) => ReactNode }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", gap: 12 }}>
      {CASES.map(({ width, footprint }) => <div key={`${width}-${footprint}`} style={{ width, maxWidth: "100%" }}>{children(footprint)}</div>)}
    </div>
  );
}

function Light({ seed, footprint }: { seed: DemoSeed; footprint: CardFootprint }) {
  const demo = useDemoLight(seed);
  return <LightTile {...demo} footprint={footprint} />;
}
function Climate({ seed, footprint }: { seed: ClimateSeed; footprint: CardFootprint }) {
  const demo = useDemoClimate(seed);
  return <ClimateTile {...demo} footprint={footprint} />;
}

/** Dev-only chrome: plain, out of the way, switching is instant. */
function DataToggle({ value, onChange }: { value: "demo" | "worst"; onChange: (v: "demo" | "worst") => void }) {
  const seg = (v: "demo" | "worst", label: string) => (
    <button type="button" aria-pressed={value === v} onClick={() => onChange(v)}
      style={{ border: 0, borderRadius: 99, padding: "6px 14px", font: "500 13px system-ui, sans-serif", cursor: "pointer",
        background: value === v ? "#fff" : "transparent", color: "#222", boxShadow: value === v ? "0 1px 2px rgba(0,0,0,.2)" : "none" }}>{label}</button>
  );
  return (
    <div role="group" aria-label="Data" style={{ position: "fixed", left: "50%", bottom: 16, translate: "-50% 0", zIndex: 10, display: "flex", gap: 2, padding: 3, borderRadius: 99, background: "#d9d9d9" }}>
      {seg("demo", "Demo data")}{seg("worst", "Worst case")}
    </div>
  );
}

function WorstCasePage() {
  const [data, setData] = useState<"demo" | "worst">("worst");
  return (
    <div key={data} style={{ display: "grid", gap: 12, paddingBottom: 72 }}>
      {LIGHTS[data].map((seed, index) => <Row key={`l${index}`}>{(footprint) => <Light seed={seed} footprint={footprint} />}</Row>)}
      {CLIMATES[data].map((seed, index) => <Row key={`c${index}`}>{(footprint) => <Climate seed={seed} footprint={footprint} />}</Row>)}
      {WEATHERS[data].map((seed, index) => <Row key={`w${index}`}>{(footprint) => <WeatherTile entity={seed.entity} history={seed.history} hourly={seed.hourly} daily={seed.daily} footprint={footprint} />}</Row>)}
      {ALARMS[data].map((seed, index) => <Row key={`a${index}`}>{(footprint) => <Alarm seed={seed} footprint={footprint} />}</Row>)}
      {COVERS[data].map((seed, index) => <Row key={`v${index}`}>{(footprint) => <Cover seed={seed} footprint={footprint} />}</Row>)}
      {TOGGLES[data].map((seed, index) => <Row key={`t${index}`}>{(footprint) => <Toggle seed={seed} footprint={footprint} />}</Row>)}
      {SENSORS[data].map((seed, index) => <Row key={`s${index}`}>{(footprint) => <SensorTile entity={seed.entity} history={seed.history} footprint={footprint} />}</Row>)}
      {HUMIDIFIERS[data].map((seed, index) => <Row key={`h${index}`}>{(footprint) => <DemoHumidifierTile seed={seed} footprint={footprint} />}</Row>)}
      {SOUNDS[data].map((seed, index) => <Row key={`n${index}`}>{(footprint) => <DemoSoundTile seed={seed} footprint={footprint} />}</Row>)}
      {OWLETS[data].map((seed, index) => <Row key={`o${index}`}>{(footprint) => <DemoOwletTile seed={seed} footprint={footprint} />}</Row>)}
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
