import type { Meta, StoryObj } from "@storybook/react";
import { __Skin____Name__Card } from "./__Skin____Name__Card";
import type { __Skin__Footprint } from "../../shared/ui";
import { __seedConst__, __worstConst____demoImport__ } from "./demo/__seedFile__";
import type { __seedType__, __seedNameType__ } from "./demo/__seedFile__";

const SIZES = { S: 200, M: 340, L: 464 } as const;
const SEED_NAMES = Object.keys(__seedConst__) as __seedNameType__[];

function Demo__Name__({ seed, width, footprint, defaultOpen }: { seed: __seedType__; width?: number; footprint?: __Skin__Footprint; defaultOpen?: boolean }) {
  const demo = __DEMO__;
  return <div style={{ width, maxWidth: "100%" }}><__Skin____Name__Card entity={demo.entity}__historyDemo____demoProps__ footprint={footprint} defaultOpen={defaultOpen} /></div>;
}

function Story__Name__({ __name__, ...props }: { __name__: __seedNameType__; width?: number; footprint?: __Skin__Footprint; defaultOpen?: boolean }) {
  return <Demo__Name__ seed={__seedConst__[__name__]} {...props} />;
}

const meta = {
  title: "__Stories__/Cards/__Name__",
  component: Story__Name__,
  parameters: { layout: "centered" },
  argTypes: {
    __name__: { control: "select", options: SEED_NAMES },
    width: { control: { type: "range", min: 180, max: 640, step: 2 } },
    footprint: { control: "inline-radio", options: ["compact", "standard"] },
    defaultOpen: { control: "boolean" },
  },
  args: { __name__: "__firstSeed__", width: SIZES.M, footprint: "standard" },
  render: (args) => <Story__Name__ key={`${args.__name__}-${args.defaultOpen}`} {...args} />,
} satisfies Meta<typeof Story__Name__>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Unavailable: Story = { args: { __name__: "__unavailableSeed__" } };
export const WorstCase: Story = { name: "Worst case", parameters: { layout: "padded" }, render: ({ width, footprint }) => <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>{__worstConst__.map((seed) => <Demo__Name__ key={seed.entity.entityId} seed={seed} width={width} footprint={footprint} />)}</div> };
export const AllStates: Story = { name: "All states", parameters: { layout: "padded" }, render: ({ width, footprint }) => <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>{SEED_NAMES.map((name) => <Story__Name__ key={name} __name__={name} width={width} footprint={footprint} />)}</div> };
export const Sizes: Story = { parameters: { layout: "padded" }, render: ({ __name__, footprint }) => <div style={{ display: "flex", flexWrap: "wrap", gap: 20 }}>{Object.entries(SIZES).map(([label, width]) => <figure key={label} style={{ margin: 0 }}><figcaption>{label} · {width}px</figcaption><Story__Name__ __name__={__name__} width={width} footprint={footprint} /></figure>)}</div> };
export const Footprints: Story = { render: ({ __name__, width }) => <div style={{ display: "grid", gap: 8, width }}>{(["compact", "standard"] as const).map((footprint) => <Story__Name__ key={footprint} __name__={__name__} footprint={footprint} />)}</div> };
export const Compact: Story = { args: { footprint: "compact" }, render: ({ width }) => <div style={{ display: "grid", gap: 8, width }}>{SEED_NAMES.map((name) => <Story__Name__ key={name} __name__={name} footprint="compact" />)}</div> };
export const Details: Story = { args: { defaultOpen: true } };
export const DetailsUnavailable: Story = { name: "Details, unavailable", args: { __name__: "__unavailableSeed__", defaultOpen: true } };
export const DetailsPhone: Story = { name: "Details, phone", args: { defaultOpen: true }, parameters: { viewport: { defaultViewport: "mobile2" } } };
