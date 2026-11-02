import { Fragment } from "react";
import type { ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { LcarsCardFrame } from "../shared/ui";
import type { LcarsFootprint } from "../shared/ui";
import { LcarsPage, LcarsSection } from "./layout";
import LightStories from "../cards/light/LcarsLightCard.stories";
import SensorStories from "../cards/sensor/LcarsSensorCard.stories";
// new-card: example imports

const meta = { title: "Studies/Lcars/Dashboards/Examples", parameters: { layout: "fullscreen" } } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

/** A section of the page: one Card's demo seeds, drawn by that Card's own story component. */
const section = <S extends string>(title: string, seeds: readonly S[], draw: (seed: S, footprint: LcarsFootprint) => ReactNode) => ({
  title,
  seeds: seeds as readonly string[],
  draw: draw as (seed: string, footprint: LcarsFootprint) => ReactNode,
});

/** One section per Card, in the order they were added; `npm run new-card -- <domain> --skin` adds its row. */
const SECTIONS = [
  section("Light", LightStories.argTypes.light.options, (seed, footprint) => <LightStories.component light={seed} footprint={footprint} />),
  section("Sensor", SensorStories.argTypes.sensor.options, (seed, footprint) => <SensorStories.component sensor={seed} footprint={footprint} />),
  // new-card: example sections
];

/** The page with every Card's seeds; before the skin has a Card, one neutral frame to start from. */
function Example({ compact = false }: { compact?: boolean }) {
  const footprint = compact ? "compact" : "standard";
  return (
    <LcarsPage title="Home" subtitle={SECTIONS.length ? undefined : "Neutral generated baseline"} showTime now={new Date(2026, 9, 17, 11, 54)}>
      {SECTIONS.length
        ? SECTIONS.map(({ title, seeds, draw }) => (
          <LcarsSection key={title} title={title} footprint={footprint}>
            {seeds.map((seed) => <Fragment key={seed}>{draw(seed, footprint)}</Fragment>)}
          </LcarsSection>
        ))
        : (
          <LcarsSection title="Start here" note="Replace the visual language, keep the contracts" footprint={footprint}>
            <LcarsCardFrame name="Example Card" area="Living room" state="on" summary="Ready" footprint={footprint} />
          </LcarsSection>
        )}
    </LcarsPage>
  );
}

export const Phone: Story = { render: () => <div style={{ width: 390, maxWidth: "100%", margin: "0 auto" }}><Example compact /></div> };
export const Tablet: Story = { render: () => <Example /> };
export const WallPanel: Story = { name: "Wall panel", render: () => <Example /> };
