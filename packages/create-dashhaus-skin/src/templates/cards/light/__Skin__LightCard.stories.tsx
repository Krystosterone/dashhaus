import { __Skin__LightCard } from "./__Skin__LightCard";

/** Card gallery metadata for the conformance check and for a plain Storybook-style viewer. */
export default {
  title: "__Section__/Cards/Light",
  component: __Skin__LightCard,
  args: { name: "Desk lamp", area: "Office", on: false, onToggle: () => undefined },
};

export const Off = {};
export const On = { args: { on: true, brightness: 64 } };
export const Unavailable = { args: { unavailable: true } };
