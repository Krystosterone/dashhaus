import type { Meta, StoryObj } from "@storybook/react";
import { FuturaLightCard } from "./FuturaLightCard";
import type { FuturaFootprint } from "../../shared/ui";
import { SEEDS, LIGHT_WORST_CASE, useDemoLight } from "./demo/useDemoLight";
import type { DemoSeed, SeedName } from "./demo/useDemoLight";

const SIZES = { S: 200, M: 340, L: 464 } as const;
const SEED_NAMES = Object.keys(SEEDS) as SeedName[];

function DemoLight({ seed, width, footprint, defaultOpen }: { seed: DemoSeed; width?: number; footprint?: FuturaFootprint; defaultOpen?: boolean }) {
  const demo = useDemoLight(seed);
  return <div style={{ width, maxWidth: "100%" }}><FuturaLightCard entity={demo.entity} history={demo.history} onToggle={demo.onToggle} onBrightnessChange={demo.onBrightnessChange} footprint={footprint} defaultOpen={defaultOpen} /></div>;
}

function StoryLight({ light, ...props }: { light: SeedName; width?: number; footprint?: FuturaFootprint; defaultOpen?: boolean }) {
  return <DemoLight seed={SEEDS[light]} {...props} />;
}

const meta = {
  title: "Futura/Cards/Light",
  component: StoryLight,
  parameters: { layout: "centered" },
  argTypes: {
    light: { control: "select", options: SEED_NAMES },
    width: { control: { type: "range", min: 180, max: 640, step: 2 } },
    footprint: { control: "inline-radio", options: ["compact", "standard"] },
    defaultOpen: { control: "boolean" },
  },
  args: { light: "dimmable", width: SIZES.M, footprint: "standard" },
  render: (args) => <StoryLight key={`${args.light}-${args.defaultOpen}`} {...args} />,
} satisfies Meta<typeof StoryLight>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Unavailable: Story = { args: { light: "unavailable" } };
export const WorstCase: Story = { name: "Worst case", parameters: { layout: "padded" }, render: ({ width, footprint }) => <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>{LIGHT_WORST_CASE.map((seed) => <DemoLight key={seed.entity.entityId} seed={seed} width={width} footprint={footprint} />)}</div> };
export const AllStates: Story = { name: "All states", parameters: { layout: "padded" }, render: ({ width, footprint }) => <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>{SEED_NAMES.map((name) => <StoryLight key={name} light={name} width={width} footprint={footprint} />)}</div> };
export const Sizes: Story = { parameters: { layout: "padded" }, render: ({ light, footprint }) => <div style={{ display: "flex", flexWrap: "wrap", gap: 20 }}>{Object.entries(SIZES).map(([label, width]) => <figure key={label} style={{ margin: 0 }}><figcaption>{label} · {width}px</figcaption><StoryLight light={light} width={width} footprint={footprint} /></figure>)}</div> };
export const Footprints: Story = { render: ({ light, width }) => <div style={{ display: "grid", gap: 8, width }}>{(["compact", "standard"] as const).map((footprint) => <StoryLight key={footprint} light={light} footprint={footprint} />)}</div> };
export const Compact: Story = { args: { footprint: "compact" }, render: ({ width }) => <div style={{ display: "grid", gap: 8, width }}>{SEED_NAMES.map((name) => <StoryLight key={name} light={name} footprint="compact" />)}</div> };
export const Details: Story = { args: { defaultOpen: true } };
export const DetailsUnavailable: Story = { name: "Details, unavailable", args: { light: "unavailable", defaultOpen: true } };
export const DetailsPhone: Story = { name: "Details, phone", args: { defaultOpen: true }, parameters: { viewport: { defaultViewport: "mobile2" } } };
