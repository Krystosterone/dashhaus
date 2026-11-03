import type { Meta, StoryObj } from "@storybook/react";
import { FuturaToggleCard } from "./FuturaToggleCard";
import type { FuturaFootprint } from "../../shared/ui";
import { TOGGLE_SEEDS, TOGGLE_WORST_CASE, useDemoToggle } from "@dashhaus/core/seeds/toggle";
import type { ToggleSeed, ToggleSeedName } from "@dashhaus/core/seeds/toggle";

const SIZES = { S: 200, M: 340, L: 464 } as const;
const SEED_NAMES = Object.keys(TOGGLE_SEEDS) as ToggleSeedName[];

function DemoToggle({ seed, width, footprint, defaultOpen }: { seed: ToggleSeed; width?: number; footprint?: FuturaFootprint; defaultOpen?: boolean }) {
  const demo = useDemoToggle(seed);
  return <div style={{ width, maxWidth: "100%" }}><FuturaToggleCard entity={demo.entity} history={demo.history} onToggle={demo.onToggle} footprint={footprint} defaultOpen={defaultOpen} /></div>;
}

function StoryToggle({ toggle, ...props }: { toggle: ToggleSeedName; width?: number; footprint?: FuturaFootprint; defaultOpen?: boolean }) {
  return <DemoToggle seed={TOGGLE_SEEDS[toggle]} {...props} />;
}

const meta = {
  title: "Studies/Futura/Cards/Toggle",
  component: StoryToggle,
  parameters: { layout: "centered" },
  argTypes: {
    toggle: { control: "select", options: SEED_NAMES },
    width: { control: { type: "range", min: 180, max: 640, step: 2 } },
    footprint: { control: "inline-radio", options: ["compact", "standard"] },
    defaultOpen: { control: "boolean" },
  },
  args: { toggle: "dnd", width: SIZES.M, footprint: "standard" },
  render: (args) => <StoryToggle key={`${args.toggle}-${args.defaultOpen}`} {...args} />,
} satisfies Meta<typeof StoryToggle>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Unavailable: Story = { args: { toggle: "unavailable" } };
export const WorstCase: Story = { name: "Worst case", parameters: { layout: "padded" }, render: ({ width, footprint }) => <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>{TOGGLE_WORST_CASE.map((seed) => <DemoToggle key={seed.entity.entityId} seed={seed} width={width} footprint={footprint} />)}</div> };
export const AllStates: Story = { name: "All states", parameters: { layout: "padded" }, render: ({ width, footprint }) => <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>{SEED_NAMES.map((name) => <StoryToggle key={name} toggle={name} width={width} footprint={footprint} />)}</div> };
export const Sizes: Story = { parameters: { layout: "padded" }, render: ({ toggle, footprint }) => <div style={{ display: "flex", flexWrap: "wrap", gap: 20 }}>{Object.entries(SIZES).map(([label, width]) => <figure key={label} style={{ margin: 0 }}><figcaption>{label} · {width}px</figcaption><StoryToggle toggle={toggle} width={width} footprint={footprint} /></figure>)}</div> };
export const Footprints: Story = { render: ({ toggle, width }) => <div style={{ display: "grid", gap: 8, width }}>{(["compact", "standard"] as const).map((footprint) => <StoryToggle key={footprint} toggle={toggle} footprint={footprint} />)}</div> };
export const Compact: Story = { args: { footprint: "compact" }, render: ({ width }) => <div style={{ display: "grid", gap: 8, width }}>{SEED_NAMES.map((name) => <StoryToggle key={name} toggle={name} footprint="compact" />)}</div> };
export const Details: Story = { args: { defaultOpen: true } };
export const DetailsUnavailable: Story = { name: "Details, unavailable", args: { toggle: "unavailable", defaultOpen: true } };
export const DetailsPhone: Story = { name: "Details, phone", args: { defaultOpen: true }, parameters: { viewport: { defaultViewport: "mobile2" } } };
