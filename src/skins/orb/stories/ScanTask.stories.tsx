import type { ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { DashboardPage, Section, Columns } from "../dashboards/layout";
import type { Vars } from "../shared/ui";
import { DemoLightTile as Light } from "../cards/light/demo/DemoLightTile";
import { DemoClimateTile as Climate } from "../cards/climate/demo/DemoClimateTile";
import { DemoLockTile as Lock } from "../cards/lock/demo/DemoLockTile";
import { DemoCoverTile as Cover } from "../cards/cover/demo/DemoCoverTile";
import { DemoBinarySensorTile as BinarySensor } from "../cards/binarySensor/demo/DemoBinarySensorTile";

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
 */

/** The example time, fixed so screenshots stay stable. */
const NOW = new Date(2026, 9, 17, 11, 54);

const meta = {
  title: "Orb/Foundations/Scan task",
  parameters: {
    layout: "fullscreen",
    docs: { description: { component: "The pages for the scan-task comparison of the urgency factor: plain room sections, the lit hero above or below the urgent card, on a phone and a 1280 × 800 wall panel, at a factor of 1, 0.5 and 0.25. Show a page on its own (the story's canvas, full screen) so its name doesn't give the answer away. Example data; the time is fixed at 11:54." } },
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

function Phone({ children }: { children: ReactNode }) {
  return (
    <Device label="Phone" width={390} height={844}>
      <DashboardPage title="Home" now={NOW}>{children}</DashboardPage>
    </Device>
  );
}

function Wall({ children }: { children: ReactNode }) {
  return (
    <Device label="Wall panel" width={1280} height={800}>
      <DashboardPage title="Home" now={NOW} showTime viewing="far" style={{ paddingBottom: 0 }}>
        <Columns columns={4} gap={16}>{children}</Columns>
      </DashboardPage>
    </Device>
  );
}

/** One page at one urgency factor: the factor set on the page, and given to the glow census to check it by. */
function scan(Frame: typeof Phone, rooms: ReactNode[], underAlert = 1): Story {
  return {
    parameters: { glowBudget: { underAlert } },
    render: () => (
      <div style={{ "--glow-damp-under-alert": underAlert } as Vars}>
        <Frame>{rooms}</Frame>
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
