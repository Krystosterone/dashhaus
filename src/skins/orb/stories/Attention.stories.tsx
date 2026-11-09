import type { ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { DashboardPage, Section } from "../dashboards/layout";
import { DemoLightTile as Light } from "../cards/light/demo/DemoLightTile";
import { DemoClimateTile as Climate } from "../cards/climate/demo/DemoClimateTile";
import { DemoAlarmTile as Alarm } from "../cards/alarm/demo/DemoAlarmTile";
import { DemoLockTile as Lock } from "../cards/lock/demo/DemoLockTile";
import { DemoCoverTile as Cover } from "../cards/cover/demo/DemoCoverTile";
import { DemoBinarySensorTile as BinarySensor } from "../cards/binarySensor/demo/DemoBinarySensorTile";

/*
 * The attention budget (spec/orb.md → Composing for a glance; .agents/skills/attention-budget), each case on its own in
 * a one-column section, where it applies: the first glowing card full, each later one at half, compact quiet, and a
 * pressing card (urgent or alarm) yielding every glow in its container by a factor that is 1 until the scan-task
 * comparison sets it. Nothing here looks different from main; it is where that comparison runs, and the Storybook run's
 * glow census (.storybook/glow-census.ts) measures every case. The same budget in a one-track Lovelace row is
 * Orb → Dashboards → Lovelace card → One-track row, beside the Lovelace card, since only a skin's lovelace/ may reach the
 * demo house.
 */

/** The example time, fixed so screenshots stay stable. */
const NOW = new Date(2026, 9, 17, 11, 54);

const meta = {
  title: "Orb/Foundations/Attention",
  parameters: {
    layout: "fullscreen",
    docs: { description: { component: "Who glows in a one-column stack: the first glowing card full, later ones at half, compact rows never, and a warning marked, never brighter. Each section is one case. Example data; the time is fixed at 11:54." } },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** A phone-wide page, so every section is the one column a phone stacks. */
function Phone({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div style={{ maxWidth: 390, marginInline: "auto" }}>
      <DashboardPage title={title} subtitle="One column, top to bottom" now={NOW}>{children}</DashboardPage>
    </div>
  );
}

function Cases() {
  return (
    <Phone title="Attention">
      <Section title="Lights after a light" note="Full, then half">
        <Light light="dimmable" />
        <Light light="coolDaylight" />
        <Climate unit="heating" />
      </Section>
      <Section title="A problem, then lights" note="Marked, never brighter">
        <Alarm alarm="triggered" />
        <Lock seed="jammed" />
        <Light light="dimmable" />
        <Light light="coolDaylight" />
      </Section>
      <Section title="A light above a problem" note="Lamps yield ×1, for now">
        <Light light="dimmable" />
        <BinarySensor seed="leak" />
        <Light light="coolDaylight" />
      </Section>
      <Section title="Advisory above a light" note="Advisory doesn't outrank">
        <Cover cover="garage" />
        <Light light="dimmable" />
        <Light light="coolDaylight" />
      </Section>
      <Section title="A compact light first" note="Its hidden glow still leads">
        <Light light="dimmable" footprint="compact" />
        <Light light="coolDaylight" />
      </Section>
      <Section title="Two columns" note="Not damped" columns={2}>
        <Light light="dimmable" />
        <Light light="coolDaylight" />
      </Section>
    </Phone>
  );
}

/** Every case on one phone-wide page. */
export const OneColumn: Story = { name: "One column", render: () => <Cases /> };

/** The same page with colour removed (the attention-budget skill's Verify step): every state still reads in words. */
export const OneColumnGreyscale: Story = {
  name: "One column, greyscale",
  render: () => <div style={{ filter: "grayscale(1)" }}><Cases /></div>,
};

/** A later lamp's details open: its sheet is drawn in its tile's cell, so it takes that cell's half. */
export const DetailsInALaterCell: Story = {
  name: "Details in a later cell",
  render: () => (
    <Phone title="Attention">
      <Section title="Lights after a light" note="Full, then half">
        <Light light="dimmable" />
        <Light light="coolDaylight" defaultOpen />
      </Section>
    </Phone>
  ),
};
