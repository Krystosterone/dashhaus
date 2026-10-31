import { useMemo } from "react";
import type { ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { FieldDashboard } from "./FieldDashboard";
import { mapModules, parseFieldConfig } from "./config";
import type { ModuleConfig } from "./config";
import { areaSections } from "./auto";
import { HaProvider } from "@dashhaus/core";
import { createHaStore } from "@dashhaus/core";
import { createDemoHaTransport } from "@dashhaus/core/demo";
import { OWLET_DEMO_ENTITIES, owletDemoEntities } from "@dashhaus/core/demo";
import type { HassEntities } from "@dashhaus/core";
import type { FieldFootprint } from "../shared/ui";

const stamp = "2026-10-19T11:20:00Z";
const entity = (id: string, name: string, state: string, attributes: Record<string, unknown>) =>
  ({ [id]: { entity_id: id, state, attributes: { friendly_name: name, ...attributes }, last_changed: stamp, last_updated: stamp } });

/** A small mixed house: Field's light types, one heating thermostat, a humidifier, a sound machine and its volume, curtains and a garage door, the house alarm (code 1234), an Owlet sock and its base station, room sensors with their companions, the weather, and modes. */
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
  ...entity("sun.sun", "Sun", "above_horizon", {}),
  ...entity("input_boolean.do_not_disturb", "Do Not Disturb", "off", {}),
  ...entity("input_boolean.guest_mode", "Guest mode", "on", {}),
  ...entity("switch.white_noise", "White noise", "on", {}),
  ...entity("number.white_noise_volume", "White noise volume", "62", { min: 0, max: 100, step: 1 }),
  ...entity("switch.office_fan", "Desk fan", "off", {}),
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
  { entity: "switch.office_fan", kind: "toggle", area: "Office", icon: "power" },
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
  const blocks = useMemo(() => areaSections(ITEMS), []);
  return (
    <House alerting={alerting}>
      <FieldDashboard title={title} showTime={showTime} hourCycle={hourCycle} blocks={blocks} footprint={footprint} quiet={quiet} />
    </House>
  );
}

/**
 * A config as Lovelace hands it to the card, drawn as the card draws it: checked, each module given its area. In
 * Home Assistant a `navigate:` key would leave for that dashboard; here it stays put.
 */
function Yaml({ yaml }: { yaml: Record<string, unknown> }) {
  const config = useMemo(() => parseFieldConfig(yaml), [yaml]);
  const blocks = useMemo(() => (config.sections ? mapModules(config.sections, placed) : areaSections((config.modules ?? ITEMS).map(placed))), [config]);
  const pages = useMemo(() => config.pages?.map((p) => ({ ...p, blocks: mapModules(p.blocks, placed) })), [config]);
  return (
    <House>
      <FieldDashboard
        title={config.title}
        subtitle={config.subtitle}
        showTime={config.showTime}
        hourCycle={config.hourCycle}
        viewing={config.viewing}
        blocks={blocks}
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

/** Sections laid out by hand, as on a phone: the keys pressed most as rows, then a room at a time. */
const SECTIONS_YAML = {
  type: "custom:dashhaus-field",
  title: "Home",
  subtitle: "Everyone home",
  sections: [
    {
      title: "Quick",
      note: "Pressed most",
      modules: [
        { entity: "input_boolean.do_not_disturb", footprint: "compact", icon: "bell-off" },
        { entity: "alarm_control_panel.house", footprint: "compact" },
        { entity: "cover.garage_door", footprint: "compact" },
        { entity: "input_boolean.guest_mode", footprint: "compact", icon: "guest" },
      ],
    },
    { title: "Living room", modules: ["light.ceiling", "climate.living_room", "light.reading_lamp", "cover.living_room_curtains"] },
    {
      title: "Nursery",
      modules: [
        { entity: "sensor.owlet_sock_ac000w0123_sleep_state", name: "Nova" },
        "light.night_light",
        { entity: "switch.white_noise", card: "sound" },
        "humidifier.nursery",
      ],
    },
    {
      title: "Outside",
      modules: [
        { entity: "weather.home", name: "Weather", span: 2, aqi: "sensor.home_aqi", aqi_scale: "US" },
        { entity: "sensor.outside_temperature", name: "Air", battery: "sensor.outside_battery", outdoor: true },
        "light.porch",
      ],
    },
  ],
};

/** docs/deploy.md's navigation example: the main page, two pages of the card's own, and another dashboard. */
const PAGES_YAML = {
  type: "custom:dashhaus-field",
  title: "Home",
  footprint: "compact",
  sections: [
    { title: "Quick", modules: ["input_boolean.do_not_disturb", "alarm_control_panel.house", "cover.garage_door", "light.porch"] },
    { title: "Rooms", modules: [{ entity: "sensor.nursery_temperature", humidity: "sensor.nursery_humidity", battery: "sensor.nursery_battery" }, { entity: "sensor.outside_temperature", battery: "sensor.outside_battery", outdoor: true }] },
  ],
  pages: [
    { id: "living", title: "Living room", sections: [{ title: "Comfort", modules: ["climate.living_room"] }, { title: "Lights and curtains", modules: ["light.ceiling", "light.reading_lamp", "cover.living_room_curtains"] }] },
    { id: "nursery", title: "Nursery", sections: [{ title: "Baby", modules: [{ entity: "sensor.owlet_sock_ac000w0123_sleep_state", name: "Nova" }, "light.night_light", { entity: "switch.white_noise", card: "sound" }, "humidifier.nursery"] }] },
  ],
  nav: [{ page: "home" }, { page: "living" }, { page: "nursery" }, { navigate: "/baby-view/0", label: "Baby view" }],
};

/** A wall panel read from across the room: one column per place, its leads whole modules and the rest rows. */
const WALL_YAML = {
  type: "custom:dashhaus-field",
  title: "Home",
  show_time: true,
  viewing: "far",
  sections: [
    {
      columns: 4,
      sections: [
        { title: "Living room", modules: ["light.ceiling", "climate.living_room", { entity: "cover.living_room_curtains", footprint: "compact" }, { entity: "light.reading_lamp", footprint: "compact" }] },
        { title: "Nursery", modules: [{ entity: "sensor.owlet_sock_ac000w0123_sleep_state", name: "Nova" }, "light.night_light", { entity: "switch.white_noise", card: "sound", footprint: "compact" }, { entity: "humidifier.nursery", footprint: "compact" }] },
        { title: "Whole home", modules: ["alarm_control_panel.house", { entity: "input_boolean.do_not_disturb", footprint: "compact" }, { entity: "input_boolean.guest_mode", footprint: "compact" }, { entity: "cover.garage_door", footprint: "compact" }] },
        { title: "Outside", modules: [{ entity: "weather.home", name: "Weather" }, { entity: "light.porch", footprint: "compact" }, { entity: "sensor.outside_temperature", name: "Air", outdoor: true, footprint: "compact" }] },
      ],
    },
  ],
};

const meta = {
  title: "Field/Dashboards/Lovelace card",
  component: Demo,
  parameters: {
    layout: "fullscreen",
    docs: { description: { component: "What `custom:dashhaus-field` draws: a section per area under its printed legend, or the `sections` and `pages` its YAML lays out, with a nav docked at the bottom; live light, climate, humidifier, sound, cover, alarm, owlet, sensor, weather and toggle modules over the demo transport. Every control works; open a module's panel from its name." } },
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
 * `sections:` laid out by hand, with a `subtitle` and a `note`, the weather spanning two tracks where its area has them.
 * With no `nav:`, the nav lists the titled sections: a tap scrolls there, and the key of the area being read stays down.
 */
export const SectionsAndNav: Story = { name: "Sections and nav", render: () => <Yaml yaml={SECTIONS_YAML} /> };
/** `pages:` and `nav:`: the main page, two pages of the card's own (kept in the URL hash), and another dashboard. */
export const NavAndPages: Story = { name: "Nav and pages", render: () => <Yaml yaml={PAGES_YAML} /> };
/** `viewing: far` on a wall panel: print and screens a step up, areas side by side, and no nav unless `nav:` lists one. */
export const WallPanelFar: Story = { name: "Wall panel, far", render: () => <Yaml yaml={WALL_YAML} /> };
