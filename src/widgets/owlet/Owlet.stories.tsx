import type { Meta, StoryObj } from "@storybook/react";
import { DemoOwletTile as DemoTile } from "./demo/DemoOwletTile";

const SIZES = { S: 174, M: 360, L: 464 } as const;
const SEEDS = ["deep", "light", "awake", "unknown", "stale", "lowOxygen", "critical", "sockOff", "lowBattery", "charging", "long"] as const;

const meta = {
  title: "Widgets/Owlet",
  component: DemoTile,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "An Owlet Smart Sock: the baby's sleep state, heart rate and oxygen saturation. A reading: a bare sock icon, " +
          "the figures as a readout, no glow. Tap the readings or the name for today's sleep, heart rate and oxygen. " +
          "While readings arrive, the heart beside the heart rate beats; once none has changed for 3 minutes it stands still, " +
          "the figures dim and the status line warns since when. The base station's alerts show too: a vitals alert (oxygen, heart rate) fills the slot in warn " +
          "like a triggered alarm; a sock or base problem leads the status line with the warn marker. While the sock charges it says Charging. " +
          "Same sizes and heights as the other widgets.",
      },
    },
  },
  argTypes: {
    seed: { control: "select", options: SEEDS, description: "Example sock" },
    width: { control: { type: "range", min: 160, max: 640, step: 2 }, description: "Container width in px" },
    footprint: { control: "inline-radio", options: ["compact", "standard", "featured"] },
    showControl: { control: "boolean", description: "Compact only: show the readings in the row (off: the row opens details)" },
    name: { control: "text" },
    defaultOpen: { control: "boolean", description: "Open the detail sheet on load" },
  },
  args: { seed: "deep", width: SIZES.M, footprint: "standard" },
  render: (args) => <DemoTile key={`${args.seed}-${args.defaultOpen}`} {...args} />,
} satisfies Meta<typeof DemoTile>;

export default meta;
type Story = StoryObj<typeof meta>;

export const DeepSleep: Story = { name: "Deep sleep" };
export const LightSleep: Story = { name: "Light sleep", args: { seed: "light" } };
export const Awake: Story = { args: { seed: "awake" } };
export const SleepStateUnknown: Story = { name: "Reading, sleep state unknown", args: { seed: "unknown" } };
export const Stale: Story = { name: "Readings stopped", args: { seed: "stale" } };
export const LowOxygen: Story = { name: "Alert: low oxygen", args: { seed: "lowOxygen" } };
export const CriticalAlerts: Story = { name: "Alert: critical oxygen and low heart rate", args: { seed: "critical" } };
export const SockOff: Story = { name: "Problem: sock off", args: { seed: "sockOff" } };
export const LowBattery: Story = { name: "Problem: battery low", args: { seed: "lowBattery" } };
export const AlertSheet: Story = { name: "Alerts in the sheet", args: { seed: "critical", defaultOpen: true } };
export const Charging: Story = { args: { seed: "charging" } };
export const Featured: Story = { args: { footprint: "featured" } };
export const WorstCase: Story = { name: "Worst case, long names", args: { seed: "long" } };

export const AllStates: Story = {
  name: "All states",
  parameters: { layout: "padded", controls: { include: ["width", "footprint"] } },
  render: ({ width, footprint }) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-start" }}>
      {SEEDS.map((seed) => <DemoTile key={seed} seed={seed} width={width} footprint={footprint} />)}
    </div>
  ),
};

export const Sizes: Story = {
  parameters: { layout: "padded", controls: { include: ["seed", "footprint"] } },
  render: ({ seed, footprint }) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 24, alignItems: "flex-start" }}>
      {(Object.entries(SIZES) as [keyof typeof SIZES, number][]).map(([label, width]) => (
        <figure key={label} style={{ margin: 0, display: "grid", gap: 8 }}>
          <figcaption style={{ font: "500 13px var(--font)", color: "var(--ink-3)" }}>{label} · {width} px</figcaption>
          <DemoTile key={`${seed}-${footprint}`} seed={seed} width={width} footprint={footprint} />
        </figure>
      ))}
    </div>
  ),
};

export const Footprints: Story = {
  parameters: { layout: "padded", controls: { include: ["seed", "width"] } },
  render: ({ seed, width }) => (
    <div style={{ display: "grid", gap: 8, width, maxWidth: "100%" }}>
      {(["compact", "standard", "featured"] as const).map((footprint) => <DemoTile key={footprint} seed={seed} footprint={footprint} />)}
    </div>
  ),
};

export const CompactAllStates: Story = {
  name: "Compact, all states",
  parameters: { layout: "padded", controls: { include: ["width"] } },
  args: { width: 360 },
  render: ({ width }) => (
    <div style={{ display: "grid", gap: 8, width, maxWidth: "100%" }}>
      {SEEDS.map((seed) => <DemoTile key={seed} seed={seed} footprint="compact" />)}
      {SEEDS.map((seed) => <DemoTile key={`${seed}-bare`} seed={seed} footprint="compact" showControl={false} />)}
    </div>
  ),
};

export const DetailsSheet: Story = { name: "Details sheet", args: { defaultOpen: true } };
export const DetailsSheetPhone: Story = {
  name: "Details sheet, phone",
  args: { defaultOpen: true },
  parameters: { viewport: { defaultViewport: "mobile2" } },
};
