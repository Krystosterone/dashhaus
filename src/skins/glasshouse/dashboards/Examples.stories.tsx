import { Fragment } from "react";
import type { ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { GlasshouseCardFrame } from "../shared/ui";
import type { GlasshouseFootprint } from "../shared/ui";
import { GlasshousePage, GlasshouseSection } from "./layout";
import ClimateStories from "../cards/climate/GlasshouseClimateCard.stories";
import LightStories from "../cards/light/GlasshouseLightCard.stories";
import LockStories from "../cards/lock/GlasshouseLockCard.stories";
import SensorStories from "../cards/sensor/GlasshouseSensorCard.stories";
import ToggleStories from "../cards/toggle/GlasshouseToggleCard.stories";
import WeatherStories from "../cards/weather/GlasshouseWeatherCard.stories";
// new-card: example imports

const meta = { title: "Studies/Glasshouse/Dashboards/Examples", parameters: { layout: "fullscreen" } } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

/** A section of the page: one Card's demo seeds, drawn by that Card's own story component. */
const section = <S extends string>(title: string, seeds: readonly S[], draw: (seed: S, footprint: GlasshouseFootprint) => ReactNode) => ({
  title,
  seeds: seeds as readonly string[],
  draw: draw as (seed: string, footprint: GlasshouseFootprint) => ReactNode,
});

/** One section per Card, in the order they were added; `npm run new-card -- <domain> --skin` adds its row. */
const SECTIONS = [
  section("Climate", ClimateStories.argTypes.climate.options, (seed, footprint) => <ClimateStories.component climate={seed} footprint={footprint} />),
  section("Light", LightStories.argTypes.light.options, (seed, footprint) => <LightStories.component light={seed} footprint={footprint} />),
  section("Lock", LockStories.argTypes.lock.options, (seed, footprint) => <LockStories.component lock={seed} footprint={footprint} />),
  section("Sensor", SensorStories.argTypes.sensor.options, (seed, footprint) => <SensorStories.component sensor={seed} footprint={footprint} />),
  section("Toggle", ToggleStories.argTypes.toggle.options, (seed, footprint) => <ToggleStories.component toggle={seed} footprint={footprint} />),
  section("Weather", WeatherStories.argTypes.weather.options, (seed, footprint) => <WeatherStories.component weather={seed} footprint={footprint} />),
  // new-card: example sections
];

/** The page with every Card's seeds; before the skin has a Card, one neutral frame to start from. */
function Example({ compact = false }: { compact?: boolean }) {
  const footprint = compact ? "compact" : "standard";
  return (
    <GlasshousePage title="Home" subtitle={SECTIONS.length ? undefined : "Neutral generated baseline"} showTime now={new Date(2026, 9, 17, 11, 54)}>
      {SECTIONS.length
        ? SECTIONS.map(({ title, seeds, draw }) => (
          <GlasshouseSection key={title} title={title} footprint={footprint}>
            {seeds.map((seed) => <Fragment key={seed}>{draw(seed, footprint)}</Fragment>)}
          </GlasshouseSection>
        ))
        : (
          <GlasshouseSection title="Start here" note="Replace the visual language, keep the contracts" footprint={footprint}>
            <GlasshouseCardFrame name="Example Card" area="Living room" state="on" summary="Ready" footprint={footprint} />
          </GlasshouseSection>
        )}
    </GlasshousePage>
  );
}

export const Phone: Story = { render: () => <div style={{ width: 390, maxWidth: "100%", margin: "0 auto" }}><Example compact /></div> };
export const Tablet: Story = { render: () => <Example /> };
export const WallPanel: Story = { name: "Wall panel", render: () => <Example /> };
