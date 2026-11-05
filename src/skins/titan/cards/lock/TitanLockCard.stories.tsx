import type { Meta, StoryObj } from "@storybook/react";
import { TitanLockCard } from "./TitanLockCard";
import type { TitanFootprint } from "../../shared/ui";
import { LOCK_SEEDS, LOCK_WORST_CASE, useDemoLock } from "@dashhaus/core/seeds/lock";
import type { LockSeed, LockSeedName } from "@dashhaus/core/seeds/lock";

const SIZES = { S: 200, M: 340, L: 464 } as const;
const SEED_NAMES = Object.keys(LOCK_SEEDS) as LockSeedName[];

function DemoLock({ seed, width, footprint, defaultOpen }: { seed: LockSeed; width?: number; footprint?: TitanFootprint; defaultOpen?: boolean }) {
  const demo = useDemoLock(seed);
  return <div style={{ width, maxWidth: "100%" }}><TitanLockCard entity={demo.entity} footprint={footprint} defaultOpen={defaultOpen} /></div>;
}

function StoryLock({ lock, ...props }: { lock: LockSeedName; width?: number; footprint?: TitanFootprint; defaultOpen?: boolean }) {
  return <DemoLock seed={LOCK_SEEDS[lock]} {...props} />;
}

const meta = {
  title: "Studies/Titan/Cards/Lock",
  component: StoryLock,
  parameters: { layout: "centered" },
  argTypes: {
    lock: { control: "select", options: SEED_NAMES },
    width: { control: { type: "range", min: 180, max: 640, step: 2 } },
    footprint: { control: "inline-radio", options: ["compact", "standard"] },
    defaultOpen: { control: "boolean" },
  },
  args: { lock: "locked", width: SIZES.M, footprint: "standard" },
  render: (args) => <StoryLock key={`${args.lock}-${args.defaultOpen}`} {...args} />,
} satisfies Meta<typeof StoryLock>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Unavailable: Story = { args: { lock: "unavailable" } };
export const WorstCase: Story = { name: "Worst case", parameters: { layout: "padded" }, render: ({ width, footprint }) => <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>{LOCK_WORST_CASE.map((seed) => <DemoLock key={seed.entity.entityId} seed={seed} width={width} footprint={footprint} />)}</div> };
export const AllStates: Story = { name: "All states", parameters: { layout: "padded" }, render: ({ width, footprint }) => <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>{SEED_NAMES.map((name) => <StoryLock key={name} lock={name} width={width} footprint={footprint} />)}</div> };
export const Sizes: Story = { parameters: { layout: "padded" }, render: ({ lock, footprint }) => <div style={{ display: "flex", flexWrap: "wrap", gap: 20 }}>{Object.entries(SIZES).map(([label, width]) => <figure key={label} style={{ margin: 0 }}><figcaption>{label} · {width}px</figcaption><StoryLock lock={lock} width={width} footprint={footprint} /></figure>)}</div> };
export const Footprints: Story = { render: ({ lock, width }) => <div style={{ display: "grid", gap: 8, width }}>{(["compact", "standard"] as const).map((footprint) => <StoryLock key={footprint} lock={lock} footprint={footprint} />)}</div> };
export const Compact: Story = { args: { footprint: "compact" }, render: ({ width }) => <div style={{ display: "grid", gap: 8, width }}>{SEED_NAMES.map((name) => <StoryLock key={name} lock={name} footprint="compact" />)}</div> };
export const Details: Story = { args: { defaultOpen: true } };
export const DetailsUnavailable: Story = { name: "Details, unavailable", args: { lock: "unavailable", defaultOpen: true } };
export const DetailsPhone: Story = { name: "Details, phone", args: { defaultOpen: true }, parameters: { viewport: { defaultViewport: "mobile2" } } };
