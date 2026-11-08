import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { OwletModule } from "./OwletModule";
import type { FieldFootprint } from "../../shared/ui";
import { OWLET_SEEDS, OWLET_WORST_CASE } from "@dashhaus/core/seeds/owlet";
import type { OwletSeed, OwletSeedName } from "@dashhaus/core/seeds/owlet";

const SIZES = { S: 200, M: 340, L: 464 } as const;
const SEEDS = Object.keys(OWLET_SEEDS) as OwletSeedName[];

/** An OwletModule with example data; its base station switches locally. */
function DemoOwlet({ seed, width, footprint, defaultOpen }: { seed: OwletSeed; width?: number; footprint?: FieldFootprint; defaultOpen?: boolean }) {
  const [baseOn, setBaseOn] = useState(seed.entity.baseOn ?? true);
  return (
    <div style={{ width, maxWidth: "100%" }}>
      <OwletModule entity={{ ...seed.entity, baseOn }} history={seed.history} footprint={footprint} defaultOpen={defaultOpen} onBaseToggle={() => setBaseOn((on) => !on)} />
    </div>
  );
}

function StoryOwlet({ owlet, ...props }: { owlet: OwletSeedName; width?: number; footprint?: FieldFootprint; defaultOpen?: boolean }) {
  return <DemoOwlet seed={OWLET_SEEDS[owlet]} {...props} />;
}

const meta = {
  title: "Field/Cards/Owlet",
  component: StoryOwlet,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "An Owlet Smart Sock as a field module: a reading, so nothing on it is pressed. Its sock lies flat where a key would be, and " +
          "today's sleep takes the fader's place. The screen reads the heart rate beside a heart that flashes every 2.4 s while readings arrive, then " +
          "the sleep state and the oxygen. A vitals alert takes the screen's first line behind the marker; a problem with the sock or base, or readings " +
          "that stopped, takes the area's line. Tap the name for the detail panel: every alert, the base station's key, today's sleep, heart " +
          "rate and oxygen. Standard modules are 160 px, compact rows 64 px.",
      },
    },
  },
  argTypes: {
    owlet: { control: "select", options: SEEDS, description: "Example sock" },
    width: { control: { type: "range", min: 180, max: 640, step: 2 }, description: "Container width in px" },
    footprint: { control: "inline-radio", options: ["compact", "standard"], description: "Module height" },
    defaultOpen: { control: "boolean", description: "Open the detail panel on load" },
  },
  args: { owlet: "deep", width: SIZES.M, footprint: "standard" },
  render: (args) => <StoryOwlet key={`${args.owlet}-${args.defaultOpen}`} {...args} />,
} satisfies Meta<typeof StoryOwlet>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Live: the heart flashes to the figure's ink once every 2.4 s, a sign of life rather than the measured rate. */
export const DeepSleep: Story = { name: "Deep sleep" };
export const LightSleep: Story = { name: "Light sleep", args: { owlet: "light" } };
export const Awake: Story = { args: { owlet: "awake" } };
/** Reading, but no sleep state yet: the heart rate and oxygen still show. */
export const SleepStateUnknown: Story = { name: "Reading, sleep state unknown", args: { owlet: "unknown" } };
/** Off, the base sounds no alarm: said in plain words in place of the area. */
export const BaseOff: Story = { name: "Base station off", args: { owlet: "baseOff" } };
/** No reading has changed for three minutes: the heart stops and goes out, the figure dims, and the area's line says since when. */
export const Stale: Story = { name: "Readings stopped", args: { owlet: "stale" } };
/** The base station is sounding: the alert and its figure take the screen's first line, behind the marker. */
export const LowOxygen: Story = { name: "Alert: low oxygen", args: { owlet: "lowOxygen" } };
/** The most urgent with a count of the rest; the device's battery takes the area's line. */
export const CriticalAlerts: Story = { name: "Alert: critical oxygen and low heart rate", args: { owlet: "critical" } };
export const SockOff: Story = { name: "Problem: sock off", args: { owlet: "sockOff" } };
export const LowBattery: Story = { name: "Problem: battery low", args: { owlet: "lowBattery" } };
/** On its charger the sock reports nothing, and says why: DOCK in the dim ink, a known resting state, never blank segments. */
export const Charging: Story = { args: { owlet: "charging" } };
/** Blank segments and when it was last seen; today's sleep so far stays. */
export const Unavailable: Story = { args: { owlet: "unavailable" } };

/** Long names, every alert at once, a reading stopped on another day, two- and three-digit figures. */
export const WorstCase: Story = {
  name: "Worst case",
  parameters: { layout: "padded", controls: { include: ["width", "footprint"] } },
  render: ({ width, footprint }) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-start" }}>
      {OWLET_WORST_CASE.map((seed) => <DemoOwlet key={seed.entity.entityId} seed={seed} width={width} footprint={footprint} />)}
    </div>
  ),
};

/** Every sock at one width. Heights match, whatever the state. */
export const AllStates: Story = {
  name: "All states",
  parameters: { layout: "padded", controls: { include: ["width", "footprint"] } },
  render: ({ width, footprint }) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-start" }}>
      {SEEDS.map((name) => <StoryOwlet key={name} owlet={name} width={width} footprint={footprint} />)}
    </div>
  ),
};

/** The same sock at S, M and L container widths. */
export const Sizes: Story = {
  parameters: { layout: "padded", controls: { include: ["owlet", "footprint"] } },
  render: ({ owlet, footprint }) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 24, alignItems: "flex-start" }}>
      {(Object.entries(SIZES) as [keyof typeof SIZES, number][]).map(([label, width]) => (
        <figure key={label} style={{ margin: 0, display: "grid", gap: 8 }}>
          <figcaption style={{ font: "600 11px var(--fd-sans)", letterSpacing: "0.06em", color: "var(--fd-ink-2)" }}>{label} · {width} PX</figcaption>
          <StoryOwlet key={owlet} owlet={owlet} width={width} footprint={footprint} />
        </figure>
      ))}
    </div>
  ),
};

/** The same sock at both footprints, the 64 px row and the 160 px module, at one width. */
export const Footprints: Story = {
  parameters: { layout: "padded", controls: { include: ["owlet", "width"] } },
  render: ({ owlet, width }) => (
    <div style={{ display: "grid", gap: 8, width, maxWidth: "100%" }}>
      {(["compact", "standard"] as const).map((footprint) => <StoryOwlet key={footprint} owlet={owlet} footprint={footprint} />)}
    </div>
  ),
};

/** Every sock as a 64 px row: the sleep state takes the area's line, or the alert or problem behind its marker. */
export const Compact: Story = {
  args: { footprint: "compact" },
  parameters: { layout: "padded", controls: { include: ["width"] } },
  render: ({ width }) => (
    <div style={{ display: "grid", gap: 8, width, maxWidth: "100%" }}>
      {SEEDS.map((name) => <StoryOwlet key={name} owlet={name} footprint="compact" />)}
    </div>
  ),
};

/** The detail panel: the screen, the base station's key, today's sleep, heart rate and oxygen. */
export const Details: Story = { args: { defaultOpen: true } };

/** Every alert sounding, listed in full under the screen. */
export const DetailsAlerts: Story = { name: "Details, alerts", args: { owlet: "critical", defaultOpen: true } };

/** The base station off: its key lies up with its LED out, and says what that means. */
export const DetailsBaseOff: Story = { name: "Details, base station off", args: { owlet: "baseOff", defaultOpen: true } };

/** Unavailable: blank screen, the hours it was gone dashed on the meters. */
export const DetailsUnavailable: Story = { name: "Details, unavailable", args: { owlet: "unavailable", defaultOpen: true } };

/** On a phone the panel is a bottom sheet: drag its header down to close. */
export const DetailsPhone: Story = {
  name: "Details, phone",
  args: { defaultOpen: true },
  parameters: { viewport: { defaultViewport: "mobile2" } },
};
