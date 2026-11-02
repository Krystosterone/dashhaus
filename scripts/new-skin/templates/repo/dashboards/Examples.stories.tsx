import { Fragment } from "react";
import type { ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { __Skin__CardFrame } from "../shared/ui";
import type { __Skin__Footprint } from "../shared/ui";
import { __Skin__Page, __Skin__Section } from "./layout";
// new-card: example imports

const meta = { title: "__Stories__/Dashboards/Examples", parameters: { layout: "fullscreen" } } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

/** A section of the page: one Card's demo seeds, drawn by that Card's own story component. */
const section = <S extends string>(title: string, seeds: readonly S[], draw: (seed: S, footprint: __Skin__Footprint) => ReactNode) => ({
  title,
  seeds: seeds as readonly string[],
  draw: draw as (seed: string, footprint: __Skin__Footprint) => ReactNode,
});

/** One section per Card, in the order they were added; `npm run new-card -- <domain> --skin` adds its row. */
const SECTIONS = [
  // new-card: example sections
];

/** The page with every Card's seeds; before the skin has a Card, one neutral frame to start from. */
function Example({ compact = false }: { compact?: boolean }) {
  const footprint = compact ? "compact" : "standard";
  return (
    <__Skin__Page title="Home" subtitle={SECTIONS.length ? undefined : "Neutral generated baseline"} showTime now={new Date(2026, 9, 17, 11, 54)}>
      {SECTIONS.length
        ? SECTIONS.map(({ title, seeds, draw }) => (
          <__Skin__Section key={title} title={title} footprint={footprint}>
            {seeds.map((seed) => <Fragment key={seed}>{draw(seed, footprint)}</Fragment>)}
          </__Skin__Section>
        ))
        : (
          <__Skin__Section title="Start here" note="Replace the visual language, keep the contracts" footprint={footprint}>
            <__Skin__CardFrame name="Example Card" area="Living room" state="on" summary="Ready" footprint={footprint} />
          </__Skin__Section>
        )}
    </__Skin__Page>
  );
}

export const Phone: Story = { render: () => <div style={{ width: 390, maxWidth: "100%", margin: "0 auto" }}><Example compact /></div> };
export const Tablet: Story = { render: () => <Example /> };
export const WallPanel: Story = { name: "Wall panel", render: () => <Example /> };
