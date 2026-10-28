import type { Meta, StoryObj } from "@storybook/react";
import { __Name__Module } from "./__Name__Module";
import type { FieldFootprint } from "../../shared/ui";
import { __CONST___SEEDS, __CONST___WORST_CASE__demoImport__ } from "./demo/__seedFile__";
import type { __Name__Seed, __Name__SeedName } from "./demo/__seedFile__";

const SIZES = { S: 200, M: 340, L: 464 } as const;
const SEEDS = Object.keys(__CONST___SEEDS) as __Name__SeedName[];

function Demo__Name__({ seed, width, footprint, defaultOpen }: { seed: __Name__Seed; width?: number; footprint?: FieldFootprint; defaultOpen?: boolean }) {
  const demo = __DEMO__;
  return (
    <div style={{ width, maxWidth: "100%" }}>
      <__Name__Module
        entity={demo.entity}
        history={demo.history}
        __demoProps__
        footprint={footprint}
        defaultOpen={defaultOpen}
      />
    </div>
  );
}

function Story__Name__({ __name__, ...props }: { __name__: __Name__SeedName; width?: number; footprint?: FieldFootprint; defaultOpen?: boolean }) {
  return <Demo__Name__ seed={__CONST___SEEDS[__name__]} {...props} />;
}

const meta = {
  title: "Field/Cards/__Name__",
  component: Story__Name__,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "One __label__ as a field module. __about__ Standard modules are 160 px, compact rows 64 px.",
      },
    },
  },
  argTypes: {
    __name__: { control: "select", options: SEEDS, description: "Example __label__" },
    width: { control: { type: "range", min: 180, max: 640, step: 2 }, description: "Container width in px" },
    footprint: { control: "inline-radio", options: ["compact", "standard"], description: "Module height" },
    defaultOpen: { control: "boolean", description: "Open the detail panel on load" },
  },
  args: { __name__: "__firstSeed__", width: SIZES.M, footprint: "standard" },
  render: (args) => <Story__Name__ key={`${args.__name__}-${args.defaultOpen}`} {...args} />,
} satisfies Meta<typeof Story__Name__>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
/** Blank segments on the screen, and when it was last seen. */
export const Unavailable: Story = { args: { __name__: "__unavailableSeed__" } };

/** Every slot at its widest: the worst-case seeds. */
export const WorstCase: Story = {
  name: "Worst case",
  parameters: { layout: "padded", controls: { include: ["width", "footprint"] } },
  render: ({ width, footprint }) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-start" }}>
      {__CONST___WORST_CASE.map((seed) => <Demo__Name__ key={seed.entity.entityId} seed={seed} width={width} footprint={footprint} />)}
    </div>
  ),
};

/** Every example at one width. Heights match, whatever the state. */
export const AllStates: Story = {
  name: "All states",
  parameters: { layout: "padded", controls: { include: ["width", "footprint"] } },
  render: ({ width, footprint }) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-start" }}>
      {SEEDS.map((name) => <Story__Name__ key={name} __name__={name} width={width} footprint={footprint} />)}
    </div>
  ),
};

/** The same __label__ at S, M and L container widths. */
export const Sizes: Story = {
  parameters: { layout: "padded", controls: { include: ["__name__", "footprint"] } },
  render: ({ __name__, footprint }) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 24, alignItems: "flex-start" }}>
      {(Object.entries(SIZES) as [keyof typeof SIZES, number][]).map(([label, width]) => (
        <figure key={label} style={{ margin: 0, display: "grid", gap: 8 }}>
          <figcaption style={{ font: "600 11px var(--fd-sans)", letterSpacing: "0.06em", color: "var(--fd-ink-2)" }}>{label} · {width} PX</figcaption>
          <Story__Name__ key={__name__} __name__={__name__} width={width} footprint={footprint} />
        </figure>
      ))}
    </div>
  ),
};

/** The same entity at both footprints, the 64 px row and the 160 px module, at one width. */
export const Footprints: Story = {
  parameters: { layout: "padded", controls: { include: ["__name__", "width"] } },
  render: ({ __name__, width }) => (
    <div style={{ display: "grid", gap: 8, width, maxWidth: "100%" }}>
      {(["compact", "standard"] as const).map((footprint) => <Story__Name__ key={footprint} __name__={__name__} footprint={footprint} />)}
    </div>
  ),
};

/** Every example as a 64 px row, stacked as a phone's column would be. */
export const Compact: Story = {
  args: { footprint: "compact" },
  parameters: { layout: "padded", controls: { include: ["width"] } },
  render: ({ width }) => (
    <div style={{ display: "grid", gap: 8, width, maxWidth: "100%" }}>
      {SEEDS.map((name) => <Story__Name__ key={name} __name__={name} footprint="compact" />)}
    </div>
  ),
};

/** The detail panel: the screen and today. */
export const Details: Story = { args: { defaultOpen: true } };

/** Unavailable: blank segments, and the unavailable hours dashed on the meter. */
export const DetailsUnavailable: Story = { name: "Details, unavailable", args: { __name__: "__unavailableSeed__", defaultOpen: true } };

/** On a phone the panel is a bottom sheet: drag its header down to close. */
export const DetailsPhone: Story = {
  name: "Details, phone",
  args: { defaultOpen: true },
  parameters: { viewport: { defaultViewport: "mobile2" } },
};
