import type { ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { DashboardPage, Section, Columns } from "../dashboards/layout";
import type { Vars } from "../shared/ui";
import { DemoLightTile as Light } from "../cards/light/demo/DemoLightTile";
import { DemoClimateTile as Climate } from "../cards/climate/demo/DemoClimateTile";
import { DemoLockTile as Lock } from "../cards/lock/demo/DemoLockTile";
import { DemoCoverTile as Cover } from "../cards/cover/demo/DemoCoverTile";
import { DemoBinarySensorTile as BinarySensor } from "../cards/binarySensor/demo/DemoBinarySensorTile";
import { DemoAlarmTile as Alarm } from "../cards/alarm/demo/DemoAlarmTile";
import { UrgencyStrip } from "../../../../.storybook/blocks/UrgencyStrip";

/*
 * The scan-task comparison for the attention budget's urgency factor (issue #186): the pages a person is shown and
 * asked "Is anything at home that needs you?". Every page is the same house in plain room sections, with no note that
 * says where to look. The lit hero, the same warm lamp at 80 % each time, sits above the urgent card (a leak) or below
 * it (a jammed lock) in one one-column section, and every page carries the same advisory states (the garage door left
 * open, a smoke detector's low battery) to count false alarms on; one page has nothing urgent at all. Each urgent page is drawn at the factors
 * the comparison tries: 1, today's, then 0.5 and 0.25, given here as `--glow-damp-under-alert` on the page alone, so
 * nothing outside these stories changes. The Storybook run's glow census checks each page at its own factor
 * (`parameters.glowBudget`, .storybook/glow-census.ts). Field → Foundations → Scan task draws the same rooms, in the
 * same order, under the same names.
 *
 * Every urgent page is drawn again with the urgency strip (issue #188; .storybook/blocks/UrgencyStrip.tsx), the
 * "with a line" condition: a strip over the header naming the pressing card, a tap opening its sheet. The page with
 * nothing urgent has no strip to draw, so it stands for both conditions. The strip is a prototype: nothing outside
 * these stories draws it.
 */

/** The example time, fixed so screenshots stay stable. */
const NOW = new Date(2026, 9, 17, 11, 54);

const meta = {
  title: "Orb/Foundations/Scan task",
  parameters: {
    layout: "fullscreen",
    docs: { description: { component: "The pages for the scan-task comparison of the urgency factor: plain room sections, the lit hero above or below the urgent card, on a phone and a 1280 × 800 wall panel, at a factor of 1, 0.5 and 0.25, each without and then with the urgency strip prototype (issue #188). Show a page on its own (the story's canvas, full screen) so its name doesn't give the answer away. Example data; the time is fixed at 11:54." } },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** A device-sized frame so each page is seen at its real size; the content scrolls inside, as on the device. */
function Device({ label, width, height, children }: { label: string; width: number; height: number; children: ReactNode }) {
  return (
    <figure style={{ margin: "24px auto", width, maxWidth: "100%", display: "grid", gap: 8 }}>
      <figcaption style={{ font: "500 13px var(--font)", color: "var(--ink-2)", paddingInline: 8 }}>{label} · {width} × {height}</figcaption>
      <div style={{ height, overflowY: "auto", borderRadius: 36, boxShadow: "inset 0 0 0 1px var(--line), var(--shadow)" }}>{children}</div>
    </figure>
  );
}

/* The rooms every page is built from. */
const Living = () => (
  <Section title="Living room">
    <Light light="dimmableNoWarmth" name="Floor lamp" area="Living room" />
    <Climate unit="heating" footprint="compact" />
    <Cover cover="curtains" footprint="compact" />
  </Section>
);
const Hall = () => (
  <Section title="Hall">
    <Lock seed="locked" />
    <Light light="onOff" area="Hall" footprint="compact" />
  </Section>
);
const QuietGarage = () => (
  <Section title="Garage">
    <Cover cover="garage" />
    <Light light="onOff" name="Garage lights" area="Garage" footprint="compact" />
  </Section>
);
const QuietKitchen = ({ hero }: { hero?: boolean }) => (
  <Section title="Kitchen">
    <Light light="dimmable" name="Pendants" area="Kitchen" footprint={hero ? "featured" : undefined} />
    <BinarySensor seed="open" />
    <BinarySensor seed="lowBattery" footprint="compact" />
  </Section>
);

/** The lit hero first in the kitchen, the leak under it. */
const heroAbove = [
  <Living key="living" />,
  <Section key="kitchen" title="Kitchen">
    <Light light="dimmable" name="Pendants" area="Kitchen" footprint="featured" />
    <BinarySensor seed="leak" />
    <BinarySensor seed="lowBattery" footprint="compact" />
  </Section>,
  <Hall key="hall" />,
  <QuietGarage key="garage" />,
];

/** The jammed lock first in the garage, the lit hero under it. */
const heroBelow = [
  <Living key="living" />,
  <Section key="garage" title="Garage">
    <Lock seed="jammed" />
    <Light light="dimmable" name="Garage lights" area="Garage" footprint="featured" />
    <Cover cover="garage" footprint="compact" />
  </Section>,
  <QuietKitchen key="kitchen" />,
  <Hall key="hall" />,
];

/** Advisory states and a lit hero, nothing urgent: what a "yes" here counts is a false alarm. */
const nothingUrgent = [<Living key="living" />, <QuietKitchen key="kitchen" hero />, <Hall key="hall" />, <QuietGarage key="garage" />];

/** With `strip`, the page is drawn under the urgency strip prototype; without, as Orb draws it today. */
function Strip({ strip, far, children }: { strip: boolean; far?: boolean; children: ReactNode }) {
  return strip ? <UrgencyStrip far={far}>{children}</UrgencyStrip> : <>{children}</>;
}

function Phone({ strip = false, children }: { strip?: boolean; children: ReactNode }) {
  return (
    <Device label="Phone" width={390} height={844}>
      <Strip strip={strip}><DashboardPage title="Home" now={NOW}>{children}</DashboardPage></Strip>
    </Device>
  );
}

function Wall({ strip = false, children }: { strip?: boolean; children: ReactNode }) {
  return (
    <Device label="Wall panel" width={1280} height={800}>
      <Strip strip={strip} far>
        <DashboardPage title="Home" now={NOW} showTime viewing="far" style={{ paddingBottom: 0 }}>
          <Columns columns={4} gap={16}>{children}</Columns>
        </DashboardPage>
      </Strip>
    </Device>
  );
}

/**
 * One page at one urgency factor, with or without the strip: the factor set on the page, and given to the glow census
 * to check it by.
 */
function scan(Frame: typeof Phone, rooms: ReactNode[], underAlert = 1, strip = false): Story {
  return {
    parameters: { glowBudget: { underAlert } },
    render: () => (
      <div style={{ "--glow-damp-under-alert": underAlert } as Vars}>
        <Frame strip={strip}>{rooms}</Frame>
      </div>
    ),
  };
}

export const PhoneHeroAbove: Story = { name: "Phone, hero above, ×1", ...scan(Phone, heroAbove) };
export const PhoneHeroAboveHalf: Story = { name: "Phone, hero above, ×0.5", ...scan(Phone, heroAbove, 0.5) };
export const PhoneHeroAboveQuarter: Story = { name: "Phone, hero above, ×0.25", ...scan(Phone, heroAbove, 0.25) };
export const PhoneHeroBelow: Story = { name: "Phone, hero below, ×1", ...scan(Phone, heroBelow) };
export const PhoneHeroBelowHalf: Story = { name: "Phone, hero below, ×0.5", ...scan(Phone, heroBelow, 0.5) };
export const PhoneHeroBelowQuarter: Story = { name: "Phone, hero below, ×0.25", ...scan(Phone, heroBelow, 0.25) };
export const PhoneNothingUrgent: Story = { name: "Phone, nothing urgent", ...scan(Phone, nothingUrgent) };
export const WallHeroAbove: Story = { name: "Wall panel, hero above, ×1", ...scan(Wall, heroAbove) };
export const WallHeroAboveHalf: Story = { name: "Wall panel, hero above, ×0.5", ...scan(Wall, heroAbove, 0.5) };
export const WallHeroAboveQuarter: Story = { name: "Wall panel, hero above, ×0.25", ...scan(Wall, heroAbove, 0.25) };
export const WallHeroBelow: Story = { name: "Wall panel, hero below, ×1", ...scan(Wall, heroBelow) };
export const WallHeroBelowHalf: Story = { name: "Wall panel, hero below, ×0.5", ...scan(Wall, heroBelow, 0.5) };
export const WallHeroBelowQuarter: Story = { name: "Wall panel, hero below, ×0.25", ...scan(Wall, heroBelow, 0.25) };
export const WallNothingUrgent: Story = { name: "Wall panel, nothing urgent", ...scan(Wall, nothingUrgent) };
export const PhoneHeroAboveStrip: Story = { name: "Phone, hero above, ×1, strip", ...scan(Phone, heroAbove, 1, true) };
export const PhoneHeroAboveHalfStrip: Story = { name: "Phone, hero above, ×0.5, strip", ...scan(Phone, heroAbove, 0.5, true) };
export const PhoneHeroAboveQuarterStrip: Story = { name: "Phone, hero above, ×0.25, strip", ...scan(Phone, heroAbove, 0.25, true) };
export const PhoneHeroBelowStrip: Story = { name: "Phone, hero below, ×1, strip", ...scan(Phone, heroBelow, 1, true) };
export const PhoneHeroBelowHalfStrip: Story = { name: "Phone, hero below, ×0.5, strip", ...scan(Phone, heroBelow, 0.5, true) };
export const PhoneHeroBelowQuarterStrip: Story = { name: "Phone, hero below, ×0.25, strip", ...scan(Phone, heroBelow, 0.25, true) };
export const WallHeroAboveStrip: Story = { name: "Wall panel, hero above, ×1, strip", ...scan(Wall, heroAbove, 1, true) };
export const WallHeroAboveHalfStrip: Story = { name: "Wall panel, hero above, ×0.5, strip", ...scan(Wall, heroAbove, 0.5, true) };
export const WallHeroAboveQuarterStrip: Story = { name: "Wall panel, hero above, ×0.25, strip", ...scan(Wall, heroAbove, 0.25, true) };
export const WallHeroBelowStrip: Story = { name: "Wall panel, hero below, ×1, strip", ...scan(Wall, heroBelow, 1, true) };
export const WallHeroBelowHalfStrip: Story = { name: "Wall panel, hero below, ×0.5, strip", ...scan(Wall, heroBelow, 0.5, true) };
export const WallHeroBelowQuarterStrip: Story = { name: "Wall panel, hero below, ×0.25, strip", ...scan(Wall, heroBelow, 0.25, true) };

/**
 * Not a study page: the strip's order for review, an alarm, a jammed lock and a leak on one page. The alarm leads, the
 * two urgent cards are `+2`, and a tap on the alarm opens its sheet.
 */
const several = [
  <Section key="hall" title="Hall">
    <Lock seed="jammed" />
    <Alarm alarm="triggered" />
  </Section>,
  <Section key="kitchen" title="Kitchen">
    <BinarySensor seed="leak" />
    <Light light="dimmable" name="Pendants" area="Kitchen" />
  </Section>,
];
export const PhoneStripSeveral: Story = { name: "Phone, strip, an alarm and two urgent", ...scan(Phone, several, 1, true) };
export const WallStripSeveral: Story = { name: "Wall panel, strip, an alarm and two urgent", ...scan(Wall, several, 1, true) };
