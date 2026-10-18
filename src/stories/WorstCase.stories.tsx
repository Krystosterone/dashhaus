import { useState } from "react";
import type { ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { LightTile } from "../widgets/light/LightTile";
import { SEEDS, useDemoLight } from "../widgets/light/demo/useDemoLight";
import type { DemoSeed } from "../widgets/light/demo/useDemoLight";
import { ClimateTile } from "../widgets/climate/ClimateTile";
import { CLIMATE_SEEDS, useDemoClimate } from "../widgets/climate/demo/useDemoClimate";
import type { ClimateSeed } from "../widgets/climate/demo/useDemoClimate";
import { SensorTile } from "../widgets/sensor/SensorTile";
import { SENSOR_SEEDS } from "../widgets/sensor/demo/sensors";
import type { SensorSeed } from "../widgets/sensor/demo/sensors";
import type { Reading } from "../widgets/sensor/types";
import { HomeTile } from "../widgets/home/HomeTile";
import { HOME_SEEDS } from "../widgets/home/demo/home";
import type { HomeSeed } from "../widgets/home/demo/home";
import { ToggleTile } from "../widgets/toggle/ToggleTile";
import { TOGGLE_SEEDS, useDemoToggle } from "../widgets/toggle/demo/useDemoToggle";
import type { ToggleSeed } from "../widgets/toggle/demo/useDemoToggle";
import { CoverTile } from "../widgets/cover/CoverTile";
import { COVER_SEEDS, useDemoCover } from "../widgets/cover/demo/useDemoCover";
import type { CoverSeed } from "../widgets/cover/demo/useDemoCover";
import { AlarmTile } from "../widgets/alarm/AlarmTile";
import { ALARM_SEEDS, useDemoAlarm } from "../widgets/alarm/demo/useDemoAlarm";
import type { AlarmSeed } from "../widgets/alarm/demo/useDemoAlarm";

/*
 * Worst-case data: values real Home Assistant installs produce, not random strings.
 * Long and compound names, missing areas, readings at and past their limits, raw floats from
 * integrations, sensors with no readings yet, handles that meet. Kept as a regression test.
 */

const H = 11;
const zeros = (n: number) => Array<number>(n).fill(0);
const day = (past: Reading[], now: Reading): Reading[] => [...past, now, ...Array<Reading>(24 - past.length - 1).fill(null)];

const LIGHTS: Record<"demo" | "worst", DemoSeed[]> = {
  demo: [SEEDS.dimmable, SEEDS.onOff],
  worst: [
    { // German compound name, long area, 1%, a Kelvin value below the bulb's own minimum
      entity: { entityId: "light.wohnzimmer", name: "Wohnzimmerdeckenleuchte", area: "Primary bedroom suite, upstairs", state: "on", supportsBrightness: true, brightness: 1, supportsColorTemp: true, kelvin: 2000, minKelvin: 2202, maxKelvin: 6535, lastChanged: "11:54" },
      past: zeros(H),
    },
    { // No area, a raw float from an integration, a bulb whose warmth range is a single value
      entity: { entityId: "light.kitchen_island_left", name: "Kitchen island pendant (left)", state: "on", supportsBrightness: true, brightness: 99.6, supportsColorTemp: true, kelvin: 2700, minKelvin: 2700, maxKelvin: 2700, lastChanged: "06:00" },
      past: Array<number>(H).fill(1),
    },
    { // Two letters, never on today
      entity: { entityId: "light.jo", name: "Jo", area: "Porch", state: "off", supportsBrightness: false, brightness: 100, lastChanged: "00:00" },
      past: zeros(H),
    },
  ],
};

const fullClimate: Pick<ClimateSeed["entity"], "hvacModes" | "presetModes" | "fanModes"> = {
  hvacModes: ["off", "heat", "cool", "heat_cool", "auto", "dry", "fan_only"],
  presetModes: ["none", "eco", "away", "boost", "comfort", "home", "sleep", "activity"],
  fanModes: ["auto", "low", "medium", "high", "top", "middle", "focus", "diffuse"],
};

const CLIMATES: Record<"demo" | "worst", ClimateSeed[]> = {
  demo: [CLIMATE_SEEDS.heating, CLIMATE_SEEDS.range],
  worst: [
    { // Fahrenheit, whole-degree steps, both thresholds on the same value, no room reading, every mode
      entity: { entityId: "climate.zone_3", name: "Mitsubishi Hyper-Heat, zone 3", area: "Finished basement & guest suite", state: "heat_cool", hvacAction: "idle", ...fullClimate, currentHumidity: 45.333333, targetLow: 68, targetHigh: 68, minTemp: 45, maxTemp: 95, step: 1, unit: "°F", presetMode: "activity", fanMode: "diffuse", lastChanged: "11:02" },
      past: zeros(H), activity: "running",
    },
    { // Stacked diacritics, at the top of its range, heating all day
      entity: { entityId: "climate.office", name: "Đặng Thị Ngọc Hân’s office", area: "Office", state: "heat", hvacAction: "heating", hvacModes: ["off", "heat"], currentTemperature: 29.96, currentHumidity: 61.7, targetTemperature: 30, minTemp: 7, maxTemp: 30, step: 0.5, unit: "°C", lastChanged: "00:01" },
      past: Array<number>(H).fill(1), activity: "heating",
    },
    { // A raw fan mode from the integration
      entity: { entityId: "climate.dehumidifier", name: "Dehumidifier", area: "Laundry", state: "dry", hvacAction: "drying", hvacModes: ["off", "dry"], currentTemperature: 18.04, minTemp: 16, maxTemp: 30, step: 1, unit: "°C", fanMode: "quiet_night", fanModes: ["quiet_night", "auto"], lastChanged: "09:30" },
      past: [0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1], activity: "running",
    },
  ],
};

const SENSORS: Record<"demo" | "worst", SensorSeed[]> = {
  demo: [SENSOR_SEEDS.living, SENSOR_SEEDS.outdoor],
  worst: [
    { // Hovering around zero outdoors, saturated humidity, a nearly flat battery
      entity: { entityId: "sensor.backyard", name: "Backyard weather station", area: "Garden, north side", state: "ok", temperature: -0.04, humidity: 100, unit: "°C", outdoor: true, battery: 1, lastUpdated: "11:53" },
      history: { temperature: day([1.2, 0.8, 0.3, -0.2, -0.6, -0.9, -0.7, -0.4, -0.1, 0.0, -0.02], -0.04), humidity: day([97, 98, 99, 100, 100, 100, 100, 100, 100, 100, 100], 100), currentHour: H },
    },
    { // Sauna: far past every comfort band, almost no humidity
      entity: { entityId: "sensor.sauna", name: "Sauna", area: "Spa", state: "ok", temperature: 92.4, humidity: 4, unit: "°C", lastUpdated: "11:54" },
      history: { temperature: day([21, 21, 21, 21, 21, 21, 21, 40, 75, 88, 91], 92.4), humidity: day([40, 40, 40, 40, 40, 40, 40, 20, 8, 5, 4], 4), currentHour: H },
    },
    { // Paired at midnight, no reading has arrived yet
      entity: { entityId: "sensor.crawlspace", name: "Crawlspace", area: "Basement", state: "ok", unit: "°C", battery: 100 },
      history: { temperature: day(Array<Reading>(H).fill("unavailable"), null), humidity: day(Array<Reading>(H).fill("unavailable"), null), currentHour: H },
    },
    { // Long compound name, bone dry
      entity: { entityId: "sensor.arbeitszimmer", name: "Arbeitszimmer-Fensterbank", area: "Arbeitszimmer", state: "ok", temperature: 12.25, humidity: 0, unit: "°C", battery: 15, lastUpdated: "11:41" },
      history: { temperature: day([13, 13, 12.9, 12.8, 12.6, 12.5, 12.4, 12.3, 12.3, 12.3, 12.3], 12.25), humidity: day(zeros(H), 0), currentHour: H },
    },
  ],
};

const HOMES: Record<"demo" | "worst", HomeSeed[]> = {
  demo: [HOME_SEEDS.partly],
  worst: [
    { // Fahrenheit and mph, a long place name, hazardous air, a gale, no forecast and no history
      entity: { entityId: "weather.farm", name: "Ferme Sainte-Anne-des-Plaines", state: "exceptional", temperature: 104.3, apparentTemperature: 112.8, humidity: 9, pressure: 29.71, windSpeed: 61, windGustSpeed: 84, windBearing: 200, uvIndex: 12, aqi: 312, temperatureUnit: "°F", windSpeedUnit: "mph", pressureUnit: "inHg", lastUpdated: "11:54" },
      history: { temperature: [], currentHour: H }, hourly: [], daily: [],
    },
    { // Only humidity reported: no temperature, no wind, no air quality
      entity: { entityId: "weather.cabin", name: "Cabin", state: "fog", humidity: 100, temperatureUnit: "°C", windSpeedUnit: "km/h", pressureUnit: "hPa" },
      history: { temperature: Array<Reading>(H).fill("unavailable"), currentHour: H }, hourly: [], daily: [],
    },
  ],
};

const TOGGLES: Record<"demo" | "worst", ToggleSeed[]> = {
  demo: [TOGGLE_SEEDS.dnd],
  worst: [
    { // A long French name, no area, on until a time tomorrow, no description
      entity: { entityId: "input_boolean.ne_pas_deranger", name: "Ne pas déranger – chambre principale", state: "on", icon: "bell-off", until: "Sun 07:00", duration: "morning", lastChanged: "23:58" },
      past: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    },
    { // No icon, no tone, never changed
      entity: { entityId: "switch.x", name: "X", state: "off" },
      past: [],
    },
  ],
};

const COVERS: Record<"demo" | "worst", CoverSeed[]> = {
  demo: [COVER_SEEDS.curtains, COVER_SEEDS.garage],
  worst: [
    { // A long name, curtains a hair from closed, moving, with no stop
      entity: { entityId: "cover.salon", name: "Rideaux du grand salon (côté jardin)", area: "Salon", state: "closing", deviceClass: "curtain", position: 1, supportsPosition: true, supportsStop: false, lastChanged: "21:59" },
      past: [],
    },
    { // A gate with no area and no history, left open, never reported when it changed
      entity: { entityId: "cover.gate", name: "Gate", state: "open", deviceClass: "gate", supportsPosition: false, supportsStop: false },
      past: [],
    },
  ],
};

const ALARMS: Record<"demo" | "worst", AlarmSeed[]> = {
  demo: [ALARM_SEEDS.away],
  worst: [
    { // Every arm mode, a long name, three open sensors, a text code, nobody recorded as changing it
      entity: { entityId: "alarm_control_panel.chalet", name: "Système d'alarme du chalet", area: "Chalet", state: "disarmed", modes: ["home", "away", "night", "vacation"], codeFormat: "text", codeArmRequired: true, openSensors: ["Porte-fenêtre du salon", "Garage side door", "Bathroom window"] },
      past: [],
    },
    { // Triggered by a long-named sensor, at the end of a long night
      entity: { entityId: "alarm_control_panel.home", name: "Alarm", state: "triggered", modes: ["home", "away", "night"], codeFormat: "number", triggeredBy: "Basement egress window (north)", lastChanged: "03:12" },
      past: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    },
    { // All five arm modes, armed in custom bypass
      entity: { entityId: "alarm_control_panel.villa", name: "Villa", state: "armed_custom_bypass", modes: ["home", "away", "night", "vacation", "custom_bypass"], codeFormat: "number", changedBy: "Installer account (remote)", lastChanged: "Mon 09:40" },
      past: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    },
    { // HA's core entity mid-arming: no target mode, no delay length, so no timer
      entity: { entityId: "alarm_control_panel.shop", name: "Shop", state: "arming", modes: ["away"], codeFormat: "number" },
      past: [],
    },
  ],
};

function Alarm({ seed, thin }: { seed: AlarmSeed; thin?: boolean }) {
  const demo = useDemoAlarm(seed);
  return <AlarmTile {...demo} density={thin ? "thin" : "regular"} />;
}

function Cover({ seed, thin }: { seed: CoverSeed; thin?: boolean }) {
  const demo = useDemoCover(seed);
  return <CoverTile {...demo} density={thin ? "thin" : "regular"} />;
}

function Toggle({ seed, thin }: { seed: ToggleSeed; thin?: boolean }) {
  const demo = useDemoToggle(seed);
  return <ToggleTile {...demo} density={thin ? "thin" : "regular"} />;
}

/** The widths a widget really meets: S in a phone grid, M, L, and a thin row in a narrow column. */
const WIDTHS: { w: number; thin?: boolean }[] = [{ w: 170 }, { w: 320 }, { w: 480 }, { w: 300, thin: true }];

function Row({ children }: { children: (w: number, thin?: boolean) => ReactNode }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", gap: 12 }}>
      {WIDTHS.map(({ w, thin }, i) => <div key={i} style={{ width: w, maxWidth: "100%" }}>{children(w, thin)}</div>)}
    </div>
  );
}

function Light({ seed, thin }: { seed: DemoSeed; thin?: boolean }) {
  const demo = useDemoLight(seed);
  return <LightTile {...demo} density={thin ? "thin" : "regular"} />;
}
function Climate({ seed, thin }: { seed: ClimateSeed; thin?: boolean }) {
  const demo = useDemoClimate(seed);
  return <ClimateTile {...demo} density={thin ? "thin" : "regular"} />;
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
      {LIGHTS[data].map((s, i) => <Row key={`l${i}`}>{(_, thin) => <Light seed={s} thin={thin} />}</Row>)}
      {CLIMATES[data].map((s, i) => <Row key={`c${i}`}>{(_, thin) => <Climate seed={s} thin={thin} />}</Row>)}
      {HOMES[data].map((s, i) => <Row key={`h${i}`}>{(_, thin) => <HomeTile entity={s.entity} history={s.history} hourly={s.hourly} daily={s.daily} density={thin ? "thin" : "regular"} />}</Row>)}
      {ALARMS[data].map((s, i) => <Row key={`a${i}`}>{(_, thin) => <Alarm seed={s} thin={thin} />}</Row>)}
      {COVERS[data].map((s, i) => <Row key={`v${i}`}>{(_, thin) => <Cover seed={s} thin={thin} />}</Row>)}
      {TOGGLES[data].map((s, i) => <Row key={`t${i}`}>{(_, thin) => <Toggle seed={s} thin={thin} />}</Row>)}
      {SENSORS[data].map((s, i) => <Row key={`s${i}`}>{(_, thin) => <SensorTile entity={s.entity} history={s.history} density={thin ? "thin" : "regular"} />}</Row>)}
      <DataToggle value={data} onChange={setData} />
    </div>
  );
}

const meta = {
  title: "Foundations/Worst case",
  parameters: { layout: "padded" },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

/** Every widget against realistic worst-case data at S, M, L and thin. Flip to Demo data to compare. */
export const AllWidgets: Story = { render: () => <WorstCasePage /> };
