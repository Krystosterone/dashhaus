import { useMemo } from "react";
import type { ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { FieldDashboard } from "./FieldDashboard";
import { mapRowItems } from "@dashhaus/core/lovelace/schema";
import { parseFieldConfig } from "./config";
import type { ModuleConfig } from "./config";
import { areaColumns, areaName, areaRows, autoModules, energyModules } from "./auto";
import { areaOrder, outsideArea } from "@dashhaus/core/lovelace/layout";
import { HaProvider, useHaSelector } from "@dashhaus/core";
import { createHaStore } from "@dashhaus/core";
import { DEMO_ENERGY_PREFS, DEMO_WALL_HOUSE, DEMO_WALL_HOUSE_ORDERED, DEMO_WALL_HOUSE_WORST_CASE, createDemoHaTransport, createDemoHouseTransport, createDemoWallHouseTransport, demoWallInput } from "@dashhaus/core/demo";
import type { DemoWallHouse } from "@dashhaus/core/demo";
import { OWLET_DEMO_ENTITIES, owletDemoEntities } from "@dashhaus/core/demo";
import type { HassEntities } from "@dashhaus/core";
import type { FieldFootprint } from "../shared/ui";

const stamp = "2026-10-19T11:20:00Z";
const entity = (id: string, name: string, state: string, attributes: Record<string, unknown>) =>
  ({ [id]: { entity_id: id, state, attributes: { friendly_name: name, ...attributes }, last_changed: stamp, last_updated: stamp } });

/** A small mixed house: Field's light types, one heating thermostat, a humidifier, a desk fan, a sound machine and its volume, curtains and a garage door, the house alarm (code 1234), an Owlet sock and its base station, room sensors with their companions, a CO₂ sensor, the weather, and modes. */
const ENTITIES: HassEntities = {
  ...entity("light.ceiling", "Ceiling", "on", { supported_color_modes: ["color_temp"], color_mode: "color_temp", brightness: 204, color_temp_kelvin: 2700, min_color_temp_kelvin: 2200, max_color_temp_kelvin: 6500 }),
  ...entity("light.reading_lamp", "Reading lamp", "off", { supported_color_modes: ["color_temp"], min_color_temp_kelvin: 2200, max_color_temp_kelvin: 6500 }),
  ...entity("light.night_light", "Night light", "on", { supported_color_modes: ["hs"], color_mode: "hs", brightness: 8, hs_color: [31, 94] }),
  ...entity("light.desk_strip", "Desk strip", "on", { supported_color_modes: ["color_temp", "hs"], color_mode: "color_temp", brightness: 153, color_temp_kelvin: 4000, min_color_temp_kelvin: 2200, max_color_temp_kelvin: 6500 }),
  ...entity("light.porch", "Porch", "on", { supported_color_modes: ["onoff"], color_mode: "onoff" }),
  ...entity("climate.living_room", "Thermostat", "heat", { hvac_modes: ["off", "heat", "cool", "heat_cool"], hvac_action: "heating", current_temperature: 20.4, current_humidity: 41, temperature: 21.5, min_temp: 7, max_temp: 30, target_temp_step: 0.5, temperature_unit: "°C", preset_mode: "home", preset_modes: ["home", "away", "sleep"], fan_mode: "auto", fan_modes: ["auto", "low", "high"] }),
  ...entity("sensor.nursery_temperature", "Nursery air", "20.6", { device_class: "temperature", unit_of_measurement: "°C" }),
  ...entity("sensor.nursery_humidity", "Nursery humidity", "47", { device_class: "humidity", unit_of_measurement: "%" }),
  ...entity("sensor.nursery_battery", "Nursery battery", "64", { device_class: "battery", unit_of_measurement: "%" }),
  ...entity("sensor.outside_temperature", "Outside", "6.2", { device_class: "temperature", unit_of_measurement: "°C" }),
  ...entity("sensor.outside_battery", "Outside battery", "9", { device_class: "battery", unit_of_measurement: "%" }),
  ...entity("weather.home", "Home", "rainy", { temperature: 7.4, apparent_temperature: 4.9, dew_point: 6.1, humidity: 91, pressure: 1006, wind_speed: 22, wind_gust_speed: 38, wind_bearing: 250, uv_index: 1, temperature_unit: "°C", wind_speed_unit: "km/h", pressure_unit: "hPa" }),
  ...entity("sensor.home_aqi", "Air quality", "38", { device_class: "aqi", unit_of_measurement: "AQI" }),
  ...entity("sensor.living_room_co2", "Living room CO₂", "650", { device_class: "carbon_dioxide", unit_of_measurement: "ppm", state_class: "measurement" }),
  ...entity("sun.sun", "Sun", "above_horizon", {}),
  ...entity("input_boolean.do_not_disturb", "Do Not Disturb", "off", {}),
  ...entity("input_boolean.guest_mode", "Guest mode", "on", {}),
  ...entity("switch.white_noise", "White noise", "on", {}),
  ...entity("number.white_noise_volume", "White noise volume", "62", { min: 0, max: 100, step: 1 }),
  ...entity("fan.office", "Desk fan", "on", { percentage: 67, percentage_step: 100 / 3, preset_modes: ["normal", "sleep"], oscillating: true, supported_features: 1 | 2 | 8 | 16 | 32 }),
  ...entity("cover.living_room_curtains", "Curtains", "open", { device_class: "curtain", current_position: 70, supported_features: 1 | 2 | 4 | 8 }),
  ...entity("cover.garage_door", "Garage door", "closed", { device_class: "garage", supported_features: 1 | 2 | 8 }),
  ...entity("alarm_control_panel.house", "Alarm", "disarmed", { code_format: "number", code_arm_required: true, supported_features: 1 | 2 | 4, changed_by: "Alex" }),
  ...OWLET_DEMO_ENTITIES,
  ...entity("humidifier.nursery", "Humidifier", "on", { device_class: "humidifier", action: "humidifying", current_humidity: 38, humidity: 45, min_humidity: 30, max_humidity: 80, mode: "normal", available_modes: ["normal", "eco", "sleep", "boost"] }),
};

const ITEMS: ModuleConfig[] = [
  { entity: "light.ceiling", kind: "light", area: "Living room" },
  { entity: "climate.living_room", kind: "climate", area: "Living room" },
  { entity: "light.reading_lamp", kind: "light", area: "Living room" },
  { entity: "cover.living_room_curtains", kind: "cover", area: "Living room" },
  { entity: "input_boolean.do_not_disturb", kind: "toggle", area: "Home", icon: "bell-off", description: "Silences phone notifications, the doorbell chime and speaker announcements." },
  { entity: "input_boolean.guest_mode", kind: "toggle", area: "Home", icon: "guest" },
  { entity: "alarm_control_panel.house", kind: "alarm", area: "Home" },
  { entity: "sensor.owlet_sock_ac000w0123_sleep_state", kind: "owlet", name: "Nova", area: "Nursery" },
  { entity: "light.night_light", kind: "light", area: "Nursery" },
  { entity: "switch.white_noise", kind: "sound", area: "Nursery" },
  { entity: "humidifier.nursery", kind: "humidifier", area: "Nursery" },
  { entity: "sensor.nursery_temperature", kind: "sensor", area: "Nursery", humidity: "sensor.nursery_humidity", battery: "sensor.nursery_battery" },
  { entity: "light.desk_strip", kind: "light", area: "Office" },
  { entity: "fan.office", kind: "fan", area: "Office" },
  { entity: "light.porch", kind: "light", area: "Outside" },
  { entity: "cover.garage_door", kind: "cover", area: "Outside" },
  { entity: "sensor.outside_temperature", kind: "sensor", area: "Outside", battery: "sensor.outside_battery", outdoor: true },
  { entity: "weather.home", kind: "weather", area: "Outside", aqi: "sensor.home_aqi", aqiScale: "US", sun: "sun.sun" },
];

/** The same house in trouble: the sock's oxygen alarm and a low battery, and the house alarm triggered. */
const ALERTING: HassEntities = {
  ...ENTITIES,
  ...owletDemoEntities({ "binary_sensor.owlet_sock_ac000w0123_low_oxygen_alert": "on", "binary_sensor.owlet_sock_ac000w0123_low_battery_alert": "on" }),
  ...entity("alarm_control_panel.house", "Alarm", "triggered", { code_format: "number", code_arm_required: true, supported_features: 1 | 2 | 4, changed_by: "Alex" }),
};

/** The header's time, fixed so screenshots stay stable. */
const NOW = new Date(2026, 9, 17, 11, 54);

/** Each module's area, standing in for Home Assistant's registries. */
const AREAS = new Map(ITEMS.map((m) => [m.entity, m.area]));
const placed = (m: ModuleConfig): ModuleConfig => ({ ...m, area: m.area ?? AREAS.get(m.entity) });

function House({ alerting, children }: { alerting?: boolean; children: ReactNode }) {
  const store = useMemo(() => createHaStore(createDemoHaTransport(alerting ? ALERTING : ENTITIES)), [alerting]);
  return <HaProvider store={store}>{children}</HaProvider>;
}

function Demo({ title, showTime, hourCycle, footprint, quiet, alerting }: { title?: string; showTime?: boolean; hourCycle?: "h12" | "h23"; footprint: FieldFootprint; quiet?: boolean; alerting?: boolean }) {
  const rows = useMemo(() => areaRows(ITEMS), []);
  return (
    <House alerting={alerting}>
      <FieldDashboard title={title} showTime={showTime} hourCycle={hourCycle} rows={rows} footprint={footprint} quiet={quiet} />
    </House>
  );
}

/**
 * The automatic layout, as the card draws it when `cards` and `rows` are left out, on the demo house with its energy
 * preferences: every module (no registries here, so no area rows), then its grid's power and meter under Energy, last.
 */
function Automatic() {
  const states = useHaSelector((snapshot) => snapshot.entities);
  const rows = useMemo(() => {
    const input = { states, energy: DEMO_ENERGY_PREFS };
    const modules = autoModules(input);
    return areaRows(modules, energyModules(input, modules));
  }, [states]);
  return <FieldDashboard title="Home" rows={rows} footprint="standard" now={NOW} />;
}

function AutomaticHouse() {
  const store = useMemo(() => createHaStore(createDemoHouseTransport()), []);
  return <HaProvider store={store}><Automatic /></HaProvider>;
}

/** A panel's frame, at its real size: what is past its height is past the fold, and scrolls inside. */
function Panel({ label, width, height, children }: { label: string; width: number; height: number; children: ReactNode }) {
  return (
    <figure style={{ margin: "24px auto", width, maxWidth: "100%", display: "grid", gap: 8 }}>
      <figcaption style={{ font: "600 11px var(--fd-sans)", fontStretch: "var(--fd-wide)", letterSpacing: "0.06em", color: "var(--fd-ink-2)", paddingInline: 8 }}>
        {label.toUpperCase()} · {width} × {height}
      </figcaption>
      <div style={{ height, overflowY: "auto", borderRadius: 28, boxShadow: "inset 0 0 0 1px var(--fd-hairline)" }}>{children}</div>
    </figure>
  );
}

/**
 * The automatic layout with `layout: wall` and `viewing: far`, as a wall panel's card draws it, on the demo house in
 * several rooms (`DEMO_WALL_HOUSE`): one column per area under its legend, each module its area from the registries.
 */
function Wall({ house }: { house: DemoWallHouse }) {
  const states = useHaSelector((snapshot) => snapshot.entities);
  const rows = useMemo(() => {
    const input = demoWallInput(states, house);
    const withArea = (m: ModuleConfig): ModuleConfig => ({ ...m, area: m.area ?? areaName(input, m.entity) });
    const modules = autoModules(input);
    return areaColumns(modules.map(withArea), energyModules(input, modules).map(withArea), { outside: outsideArea(input), order: areaOrder(input) });
  }, [states, house]);
  return <FieldDashboard title="Home" showTime viewing="far" rows={rows} footprint="standard" now={NOW} />;
}

function WallHouse({ house = DEMO_WALL_HOUSE, label, width = 1280, height = 800 }: { house?: DemoWallHouse; label: string; width?: number; height?: number }) {
  const store = useMemo(() => createHaStore(createDemoWallHouseTransport(house)), [house]);
  return (
    <HaProvider store={store}>
      <Panel label={label} width={width} height={height}><Wall house={house} /></Panel>
    </HaProvider>
  );
}

/**
 * A config as Lovelace hands it to the card, drawn as the card draws it: checked, each module given its area. In
 * Home Assistant a `navigate:` key would leave for that dashboard; here it stays put.
 */
function Yaml({ yaml }: { yaml: Record<string, unknown> }) {
  const config = useMemo(() => parseFieldConfig(yaml), [yaml]);
  const rows = useMemo(() => (config.rows ? mapRowItems(config.rows, placed) : areaRows(ITEMS.map(placed))), [config]);
  const pages = useMemo(() => config.pages?.map((p) => ({ ...p, rows: mapRowItems(p.rows, placed) })), [config]);
  return (
    <House>
      <FieldDashboard
        title={config.title}
        subtitle={config.subtitle}
        showTime={config.showTime}
        hourCycle={config.hourCycle}
        viewing={config.viewing}
        rows={rows}
        pages={pages}
        nav={config.nav}
        footprint={config.footprint}
        quiet={config.quiet}
        now={NOW}
        navigate={() => undefined}
      />
    </House>
  );
}

/** Rows laid out by hand, as on a phone: the keys pressed most as rows, then a room at a time. */
const ROWS_YAML = {
  type: "custom:dashhaus-field",
  title: "Home",
  subtitle: "Everyone home",
  rows: [
    {
      title: "Quick",
      note: "Pressed most",
      cards: [
        { entity: "input_boolean.do_not_disturb", footprint: "compact", icon: "bell-off" },
        { entity: "alarm_control_panel.house", footprint: "compact" },
        { entity: "cover.garage_door", footprint: "compact" },
        { entity: "input_boolean.guest_mode", footprint: "compact", icon: "guest" },
      ],
    },
    { title: "Living room", cards: ["light.ceiling", "climate.living_room", "light.reading_lamp", "cover.living_room_curtains"] },
    {
      title: "Nursery",
      cards: [
        { entity: "sensor.owlet_sock_ac000w0123_sleep_state", name: "Nova" },
        "light.night_light",
        { entity: "switch.white_noise", card: "sound" },
        "humidifier.nursery",
      ],
    },
    {
      title: "Outside",
      cards: [
        { entity: "weather.home", name: "Weather", width: 2, aqi: "sensor.home_aqi", aqi_scale: "US" },
        { entity: "sensor.outside_temperature", name: "Air", battery: "sensor.outside_battery", outdoor: true },
        "light.porch",
      ],
    },
  ],
};

/** spec/deploy.md's navigation example: the main page, two pages of the card's own, and another dashboard. */
const PAGES_YAML = {
  type: "custom:dashhaus-field",
  title: "Home",
  footprint: "compact",
  rows: [
    { title: "Quick", cards: ["input_boolean.do_not_disturb", "alarm_control_panel.house", "cover.garage_door", "light.porch"] },
    { title: "Rooms", cards: [{ entity: "sensor.nursery_temperature", humidity: "sensor.nursery_humidity", battery: "sensor.nursery_battery" }, { entity: "sensor.outside_temperature", battery: "sensor.outside_battery", outdoor: true }] },
  ],
  pages: [
    { id: "living", title: "Living room", rows: [{ title: "Comfort", cards: ["climate.living_room"] }, { title: "Lights and curtains", cards: ["light.ceiling", "light.reading_lamp", "cover.living_room_curtains"] }] },
    { id: "nursery", title: "Nursery", cards: [{ entity: "sensor.owlet_sock_ac000w0123_sleep_state", name: "Nova" }, "light.night_light", { entity: "switch.white_noise", card: "sound" }, "humidifier.nursery"] },
  ],
  nav: [{ page: "home" }, { page: "living" }, { page: "nursery" }, { navigate: "/baby-view/0", label: "Baby view" }],
};

/**
 * A wall panel read from across the room: one column per area, footprints mixed by column. Each column leads with
 * whole modules and stacks rows under them. A column of one area prints its legend and its plates leave their area
 * out; a column of several (the house's modes and the garage, the outside and a CO₂ sensor) names each plate's own.
 * The CO₂ sensor is listed on its own, so its device class picks the numeric module.
 */
const WALL_YAML = {
  type: "custom:dashhaus-field",
  title: "Home",
  show_time: true,
  viewing: "far",
  rows: [
    {
      columns: 4,
      cards: [
        { entity: "light.ceiling", column: 1 },
        { entity: "climate.living_room", column: 1 },
        { entity: "cover.living_room_curtains", column: 1, footprint: "compact" },
        { entity: "light.reading_lamp", column: 1, footprint: "compact" },
        { entity: "sensor.owlet_sock_ac000w0123_sleep_state", name: "Nova", column: 2 },
        { entity: "light.night_light", column: 2 },
        { entity: "switch.white_noise", card: "sound", column: 2, footprint: "compact" },
        { entity: "humidifier.nursery", column: 2, footprint: "compact" },
        { entity: "alarm_control_panel.house", column: 3 },
        { entity: "input_boolean.do_not_disturb", column: 3, footprint: "compact" },
        { entity: "input_boolean.guest_mode", column: 3, footprint: "compact" },
        { entity: "cover.garage_door", column: 3, footprint: "compact" },
        { entity: "weather.home", name: "Weather", column: 4 },
        { entity: "light.porch", column: 4, footprint: "compact" },
        { entity: "sensor.outside_temperature", name: "Air", outdoor: true, column: 4, footprint: "compact" },
        // On its own: no card: and no sensor key, so its device class picks the numeric module.
        { entity: "sensor.living_room_co2", area: "Living room", column: 4, footprint: "compact" },
      ],
    },
  ],
};

/** spec/deploy.md's power example for field: a hero across two tracks, an anchored column beside it, dense flow. */
const COMPOSED_YAML = {
  type: "custom:dashhaus-field",
  title: "Home",
  rows: [
    {
      title: "At a glance",
      columns: 3,
      flow: "dense",
      cards: [
        { entity: "weather.home", name: "Weather", width: 2 },
        { entity: "alarm_control_panel.house", column: 3 },
        { entity: "climate.living_room", width: 2 },
        "light.ceiling",
      ],
    },
    {
      title: "Living room",
      columns: 2,
      align: "bottom",
      cards: [
        { entity: "light.reading_lamp", column: 1 },
        { entity: "cover.living_room_curtains", column: 1, footprint: "compact" },
        { entity: "input_boolean.do_not_disturb", column: 2, footprint: "compact" },
      ],
    },
  ],
};

const meta = {
  title: "Field/Dashboards/Lovelace card",
  component: Demo,
  parameters: {
    layout: "fullscreen",
    docs: { description: { component: "What `custom:dashhaus-field` draws: a row per area under its printed legend, or the `cards`, `rows` and `pages` its YAML lays out, with a nav docked at the bottom; live light, climate, humidifier, sound, cover, alarm, owlet, sensor, weather and toggle modules over the demo transport. Every control works; open a module's panel from its name." } },
  },
  argTypes: {
    footprint: { control: "inline-radio", options: ["standard", "compact"] },
    title: { control: "text" },
    showTime: { control: "boolean", description: "A clock in the header (YAML `show_time`)" },
    hourCycle: { control: "inline-radio", options: [undefined, "h12", "h23"], description: "YAML `hour_cycle`" },
    quiet: { control: "boolean", description: "An alarm holds its inversion, with no flash" },
  },
  args: { title: "Home", footprint: "standard" },
} satisfies Meta<typeof Demo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Standard: Story = {};
/** Every module a 64 px row: a phone's whole house in one screen. */
export const Compact: Story = { args: { footprint: "compact" } };
/** `show_time: true`: the clock on a strip of screen beside the title, live. */
export const WithTime: Story = { name: "With time", args: { showTime: true } };
/** On a phone. */
export const Phone: Story = { parameters: { viewport: { defaultViewport: "mobile2" } } };
/**
 * Two alarms: the alert line under the title lists them, alarms first, and a tap opens the module's panel; each module
 * inverts its screen and flashes for ten seconds, then holds. Set `quiet` for a nursery's panel: no flash.
 */
export const WithAlerts: Story = { name: "With alerts", args: { alerting: true } };

/**
 * `rows:` laid out by hand, with a `subtitle` and a `note`, the weather two tracks wide where its row has them.
 * With no `nav:`, the nav lists the titled rows: a tap scrolls there, and the key of the row being read stays down.
 */
export const RowsAndNav: Story = { name: "Rows and nav", render: () => <Yaml yaml={ROWS_YAML} /> };
/** `pages:` and `nav:`: the main page, two pages of the card's own (kept in the URL hash), and another dashboard. */
export const NavAndPages: Story = { name: "Nav and pages", render: () => <Yaml yaml={PAGES_YAML} /> };
/**
 * `viewing: far` on a wall panel: print and screens a step up, areas side by side under their legends where a column
 * is one area, and no nav unless `nav:` lists one.
 */
export const WallPanelFar: Story = { name: "Wall panel, far", render: () => <Yaml yaml={WALL_YAML} /> };

export const Composition: Story = { name: "Composition", render: () => <Yaml yaml={COMPOSED_YAML} /> };
/**
 * No `cards` or `rows`: every module the house has, a row per area (none here, with no registries), then the house's
 * power and energy meters from Home Assistant's energy preferences under Energy, last.
 */
export const AutomaticLayout: Story = { name: "Automatic layout", render: () => <AutomaticHouse /> };
/**
 * `layout: wall` and `viewing: far` on a 1280 × 800 panel: a column per area, in Home Assistant's order (here by name), four across, each under its
 * legend, so its plates leave their own area out; each column leads with what is read whole and takes its rows under
 * it; the house's own alarm, modes, guest Wi-Fi and calendars end the first row, and Outside wraps under it.
 */
export const AutomaticWall: Story = { name: "Automatic layout, wall panel", render: () => <WallHouse label="Wall panel" /> };
/**
 * The worst case for a wall: eight rooms, so two more rows of areas; the longest area name, ending in an ellipsis; a
 * room of one module (the hallway's smoke alarm); and, in a late room, a jammed lock and an open door, below the fold.
 * The alert line under the header names the lock on the first screen (spec/deploy.md → The wall layout).
 */
export const AutomaticWallWorstCase: Story = { name: "Automatic layout, wall panel, worst case", render: () => <WallHouse house={DEMO_WALL_HOUSE_WORST_CASE} label="Wall panel, worst case" /> };
/**
 * The worst case once its household has put its rooms in order in Home Assistant (Settings → Areas, labels & zones →
 * Reorder): the wall follows that order, floors first, so Outside's jammed lock and open door and the living room
 * lead the first screen, and the rooms it rarely looks at wrap below. The alert line still names the lock; now its column is on the first screen too.
 */
export const AutomaticWallOrdered: Story = { name: "Automatic layout, wall panel, in Home Assistant's order", render: () => <WallHouse house={DEMO_WALL_HOUSE_ORDERED} label="Wall panel, in Home Assistant's order" /> };
/**
 * The same wall on an 800 × 1280 portrait panel: two of a module's 260 px tracks fit, so the columns wrap two by two in
 * area order, each still one area under its legend.
 */
export const AutomaticWallPortrait: Story = { name: "Automatic layout, wall panel, portrait", render: () => <WallHouse label="Wall panel, portrait" width={800} height={1280} /> };
