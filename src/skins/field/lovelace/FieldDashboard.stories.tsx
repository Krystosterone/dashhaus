import { useMemo } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { FieldDashboard } from "./FieldDashboard";
import type { ModuleConfig } from "./config";
import { HaProvider } from "../../../ha/provider";
import { createHaStore } from "../../../ha/store";
import { createDemoHaTransport } from "../../../ha/demo";
import type { HassEntities } from "../../../ha/types";
import type { FieldFootprint } from "../shared/ui";

const stamp = "2026-10-19T11:20:00Z";
const entity = (id: string, name: string, state: string, attributes: Record<string, unknown>) =>
  ({ [id]: { entity_id: id, state, attributes: { friendly_name: name, ...attributes }, last_changed: stamp, last_updated: stamp } });

/** A small mixed house: Field's light types, one heating thermostat, and room sensors with their companions. */
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
};

const ITEMS: ModuleConfig[] = [
  { entity: "light.ceiling", kind: "light", area: "Living room" },
  { entity: "climate.living_room", kind: "climate", area: "Living room" },
  { entity: "light.reading_lamp", kind: "light", area: "Living room" },
  { entity: "light.night_light", kind: "light", area: "Nursery" },
  { entity: "sensor.nursery_temperature", kind: "sensor", area: "Nursery", humidity: "sensor.nursery_humidity", battery: "sensor.nursery_battery" },
  { entity: "light.desk_strip", kind: "light", area: "Office" },
  { entity: "light.porch", kind: "light", area: "Outside" },
  { entity: "sensor.outside_temperature", kind: "sensor", area: "Outside", battery: "sensor.outside_battery", outdoor: true },
];

function Demo({ title, footprint }: { title?: string; footprint: FieldFootprint }) {
  const store = useMemo(() => createHaStore(createDemoHaTransport(ENTITIES)), []);
  return (
    <HaProvider store={store}>
      <FieldDashboard title={title} items={ITEMS} footprint={footprint} />
    </HaProvider>
  );
}

const meta = {
  title: "Field/Dashboards/Lovelace card",
  component: Demo,
  parameters: {
    layout: "fullscreen",
    docs: { description: { component: "What `custom:home-dashboard-field` draws: a section per area under its printed legend, live light, climate and sensor modules over the demo transport. Every control works; open a module's panel from its name." } },
  },
  argTypes: { footprint: { control: "inline-radio", options: ["standard", "compact"] }, title: { control: "text" } },
  args: { title: "Home", footprint: "standard" },
} satisfies Meta<typeof Demo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Standard: Story = {};
/** Every module a 64 px row: a phone's whole house in one screen. */
export const Compact: Story = { args: { footprint: "compact" } };
/** On a phone. */
export const Phone: Story = { parameters: { viewport: { defaultViewport: "mobile2" } } };
