import { __Skin__SensorCard } from "./__Skin__SensorCard";

/** Card gallery metadata for the conformance check and for a plain Storybook-style viewer. */
export default {
  title: "__Section__/Cards/Sensor",
  component: __Skin__SensorCard,
  args: { name: "Office air", area: "Office", temperature: 21.4, humidity: 46, unit: "°C" },
};

export const Reading = {};
export const TemperatureOnly = { args: { humidity: undefined } };
export const Unavailable = { args: { temperature: undefined, humidity: undefined } };
