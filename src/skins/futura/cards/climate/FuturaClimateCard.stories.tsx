import type { Meta, StoryObj } from "@storybook/react";
import { FuturaClimateCard } from "./FuturaClimateCard";
import type { FuturaFootprint } from "../../shared/ui";
import { CLIMATE_SEEDS, CLIMATE_WORST_CASE, useDemoClimate } from "./demo/useDemoClimate";
import type { ClimateSeed, ClimateSeedName } from "./demo/useDemoClimate";

const SIZES = { S: 200, M: 340, L: 464 } as const;
const SEED_NAMES = Object.keys(CLIMATE_SEEDS) as ClimateSeedName[];

function DemoClimate({ seed, width, footprint, defaultOpen }: { seed: ClimateSeed; width?: number; footprint?: FuturaFootprint; defaultOpen?: boolean }) {
  const demo = useDemoClimate(seed);
  return <div style={{ width, maxWidth: "100%" }}><FuturaClimateCard entity={demo.entity} history={demo.history} onToggle={demo.onToggle} onTargetChange={demo.onTargetChange} onRangeChange={demo.onRangeChange} onModeChange={demo.onModeChange} footprint={footprint} defaultOpen={defaultOpen} /></div>;
}

function StoryClimate({ climate, ...props }: { climate: ClimateSeedName; width?: number; footprint?: FuturaFootprint; defaultOpen?: boolean }) {
  return <DemoClimate seed={CLIMATE_SEEDS[climate]} {...props} />;
}

const meta = {
  title: "Studies/Futura/Cards/Climate",
  component: StoryClimate,
  parameters: { layout: "centered" },
  argTypes: {
    climate: { control: "select", options: SEED_NAMES },
    width: { control: { type: "range", min: 180, max: 640, step: 2 } },
    footprint: { control: "inline-radio", options: ["compact", "standard"] },
    defaultOpen: { control: "boolean" },
  },
  args: { climate: "heating", width: SIZES.M, footprint: "standard" },
  render: (args) => <StoryClimate key={`${args.climate}-${args.defaultOpen}`} {...args} />,
} satisfies Meta<typeof StoryClimate>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Unavailable: Story = { args: { climate: "unavailable" } };
export const WorstCase: Story = { name: "Worst case", parameters: { layout: "padded" }, render: ({ width, footprint }) => <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>{CLIMATE_WORST_CASE.map((seed) => <DemoClimate key={seed.entity.entityId} seed={seed} width={width} footprint={footprint} />)}</div> };
export const AllStates: Story = { name: "All states", parameters: { layout: "padded" }, render: ({ width, footprint }) => <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>{SEED_NAMES.map((name) => <StoryClimate key={name} climate={name} width={width} footprint={footprint} />)}</div> };
export const Sizes: Story = { parameters: { layout: "padded" }, render: ({ climate, footprint }) => <div style={{ display: "flex", flexWrap: "wrap", gap: 20 }}>{Object.entries(SIZES).map(([label, width]) => <figure key={label} style={{ margin: 0 }}><figcaption>{label} · {width}px</figcaption><StoryClimate climate={climate} width={width} footprint={footprint} /></figure>)}</div> };
export const Footprints: Story = { render: ({ climate, width }) => <div style={{ display: "grid", gap: 8, width }}>{(["compact", "standard"] as const).map((footprint) => <StoryClimate key={footprint} climate={climate} footprint={footprint} />)}</div> };
export const Compact: Story = { args: { footprint: "compact" }, render: ({ width }) => <div style={{ display: "grid", gap: 8, width }}>{SEED_NAMES.map((name) => <StoryClimate key={name} climate={name} footprint="compact" />)}</div> };
export const Details: Story = { args: { defaultOpen: true } };
export const DetailsUnavailable: Story = { name: "Details, unavailable", args: { climate: "unavailable", defaultOpen: true } };
export const DetailsPhone: Story = { name: "Details, phone", args: { defaultOpen: true }, parameters: { viewport: { defaultViewport: "mobile2" } } };
