import { useMemo } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { FieldDashboard } from "./FieldDashboard";
import type { ModuleConfig } from "./config";
import { HaProvider } from "../../../ha/provider";
import { createHaStore } from "../../../ha/store";
import { createDemoHaTransport } from "../../../ha/demo";
import { OWLET_DEMO_ENTITIES, owletDemoEntities } from "../../../ha/demo/owlet";
import type { HassEntities } from "../../../ha/types";
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

function Demo({ title, footprint, quiet, alerting }: { title?: string; footprint: FieldFootprint; quiet?: boolean; alerting?: boolean }) {
  const store = useMemo(() => createHaStore(createDemoHaTransport(alerting ? ALERTING : ENTITIES)), [alerting]);
  return (
    <HaProvider store={store}>
      <FieldDashboard title={title} items={ITEMS} footprint={footprint} quiet={quiet} />
    </HaProvider>
  );
}

const meta = {
  title: "Field/Dashboards/Lovelace card",
  component: Demo,
  parameters: {
    layout: "fullscreen",
    docs: { description: { component: "What `custom:home-dashboard-field` draws: a section per area under its printed legend, live light, climate, humidifier, sound, cover, alarm, owlet, sensor, weather and toggle modules over the demo transport. Every control works; open a module's panel from its name." } },
  },
  argTypes: {
    footprint: { control: "inline-radio", options: ["standard", "compact"] },
    title: { control: "text" },
    quiet: { control: "boolean", description: "An alarm holds its inversion, with no flash" },
  },
  args: { title: "Home", footprint: "standard" },
} satisfies Meta<typeof Demo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Standard: Story = {};
/** Every module a 64 px row: a phone's whole house in one screen. */
export const Compact: Story = { args: { footprint: "compact" } };
/** On a phone. */
export const Phone: Story = { parameters: { viewport: { defaultViewport: "mobile2" } } };
/**
 * Two alarms: the alert line under the title lists them, alarms first, and a tap opens the module's panel; each module
 * inverts its screen and flashes for ten seconds, then holds. Set `quiet` for a nursery's panel: no flash.
 */
export const WithAlerts: Story = { name: "With alerts", args: { alerting: true } };
