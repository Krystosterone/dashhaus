import type { Meta, StoryObj } from "@storybook/react";
import { DemoBundle } from "./demo/DemoBundle";
import type { BundleName } from "./demo/DemoBundle";

const SIZES = { S: 174, M: 360, L: 464 } as const;
const BUNDLES: BundleName[] = ["sleep", "nursery", "upstairs"];

const meta = {
  title: "Orb/Bundles",
  component: DemoBundle,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Several widgets sharing one modular card. Joined forces equal compact members; lead bundles force one standard lead and compact rows; " +
          "titled bundles put compact rows, the parts of one thing, under a 60px lid that names it and its room once. " +
          "Members can be any widget type and retain their own tap, hold and detail-sheet behavior.",
      },
    },
  },
  argTypes: {
    bundle: { control: "select", options: [...BUNDLES, "stressJoined", "stressLead", "stressTitled"] },
    width: { control: { type: "range", min: 160, max: 640, step: 2 }, description: "Container width in px" },
    defaultOpen: { control: "boolean", description: "Open the lead's sheet on load" },
  },
  args: { bundle: "nursery", width: SIZES.M },
  render: (args) => <DemoBundle key={`${args.bundle}-${args.defaultOpen}`} {...args} />,
} satisfies Meta<typeof DemoBundle>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SleepAndDnd: Story = { name: "Joined: Nova Sleep and Do Not Disturb", args: { bundle: "sleep" } };
export const Nursery: Story = { name: "Titled: sound machine", args: { bundle: "nursery" } };
export const Upstairs: Story = { name: "Lead: 2nd floor and the Dyson heater", args: { bundle: "upstairs" } };

export const Sizes: Story = {
  parameters: { layout: "padded", controls: { include: [] } },
  render: () => (
    <div style={{ display: "grid", gap: 28 }}>
      {BUNDLES.map((b) => (
        <div key={b} style={{ display: "flex", flexWrap: "wrap", gap: 24, alignItems: "flex-start" }}>
          {(Object.entries(SIZES) as [keyof typeof SIZES, number][]).map(([label, w]) => (
            <figure key={label} style={{ margin: 0, display: "grid", gap: 8 }}>
              <figcaption style={{ font: "500 13px var(--font)", color: "var(--ink-2)" }}>{label} · {w} px</figcaption>
              <DemoBundle bundle={b} width={w} />
            </figure>
          ))}
        </div>
      ))}
    </div>
  ),
};

export const LeadSheet: Story = { name: "Lead's sheet", args: { bundle: "upstairs", defaultOpen: true } };
export const LeadSheetPhone: Story = {
  name: "Lead's sheet, phone",
  args: { bundle: "upstairs", defaultOpen: true },
  parameters: { viewport: { defaultViewport: "mobile2" } },
};

export const WorstCase: Story = {
  name: "Worst case",
  parameters: { layout: "padded", controls: { include: [] } },
  render: () => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 24, alignItems: "flex-start" }}>
      {[174, 360, 464].map((w) => (
        <div key={w} style={{ display: "grid", gap: 12, width: w }}>
          <DemoBundle bundle="stressJoined" width={w} />
          <DemoBundle bundle="stressLead" width={w} />
          <DemoBundle bundle="stressTitled" width={w} />
        </div>
      ))}
    </div>
  ),
};
