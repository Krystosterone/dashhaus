import type { Meta, StoryObj } from "@storybook/react";
import { DemoAlarmTile as DemoTile } from "./demo/DemoAlarmTile";

const SIZES = { S: 174, M: 360, L: 464 } as const;
const ALARMS = ["disarmed", "openDoor", "away", "custom", "arming", "armingUnknown", "pending", "disarming", "triggered", "armFree", "noCode", "ring", "unavailable"] as const;

const meta = {
  title: "Orb/Widgets/Alarm",
  component: DemoTile,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "A security alarm (Home Assistant alarm_control_panel). The slot is the mode switch: Off, Home, Away, Night; the current mode's thumb is the accent when armed and a raised button when off. " +
          "When the code is needed, the sheet opens on a keypad and waits for the panel's answer (demo code: 1234; a physical keyboard works too). Exit and entry delays count down in the slot, " +
          "worked out from the delay length and when the state changed; without a length the slot says what's happening with no timer, " +
          "with Cancel or Disarm; a triggered alarm is the one warn-filled pill. Open doors and windows show as a warning before you arm. " +
          "The badge only shows status, so a stray tap never arms or disarms.",
      },
    },
  },
  argTypes: {
    alarm: { control: "select", options: ALARMS, description: "Example panel" },
    width: { control: { type: "range", min: 160, max: 640, step: 2 }, description: "Container width in px" },
    footprint: { control: "inline-radio", options: ["compact", "standard", "featured"] },
    showControl: { control: "boolean", description: "Compact only: show the control in the row (off: the row opens details)" },
    defaultOpen: { control: "boolean", description: "Open the detail sheet on load" },
    readOnly: { control: "boolean", description: "View only: show the state, with nothing to arm, disarm or type a code into" },
  },
  args: { alarm: "disarmed", width: SIZES.M, footprint: "standard" },
  render: (args) => <DemoTile key={`${args.alarm}-${args.defaultOpen}`} {...args} />,
} satisfies Meta<typeof DemoTile>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Disarmed: Story = {};
export const DoorOpen: Story = { name: "Disarmed, door open, code to arm", args: { alarm: "openDoor" } };
export const ArmedAway: Story = { name: "Armed away", args: { alarm: "away" } };
export const Arming: Story = { name: "Arming (exit delay)", args: { alarm: "arming" } };
export const EntryDelay: Story = { name: "Entry delay", args: { alarm: "pending" } };
export const Triggered: Story = { args: { alarm: "triggered" } };
export const NoCode: Story = { name: "No code", args: { alarm: "noCode" } };
export const ArmingUnknown: Story = { name: "Arming, delay unknown", args: { alarm: "armingUnknown" } };
export const Disarming: Story = { args: { alarm: "disarming" } };
export const CustomBypass: Story = { name: "Armed custom bypass", args: { alarm: "custom" } };
export const ArmWithoutCode: Story = { name: "Code to disarm only", args: { alarm: "armFree" } };
export const Unavailable: Story = { args: { alarm: "unavailable" } };

export const AllStates: Story = {
  name: "All states",
  parameters: { layout: "padded", controls: { include: ["width", "footprint", "readOnly"] } },
  render: ({ width, footprint, readOnly }) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-start" }}>
      {ALARMS.map((alarm) => <DemoTile key={alarm} alarm={alarm} width={width} footprint={footprint} readOnly={readOnly} />)}
    </div>
  ),
};

export const Sizes: Story = {
  parameters: { layout: "padded", controls: { include: ["alarm", "footprint", "readOnly"] } },
  render: ({ alarm, footprint, readOnly }) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 24, alignItems: "flex-start" }}>
      {(Object.entries(SIZES) as [keyof typeof SIZES, number][]).map(([label, width]) => (
        <figure key={label} style={{ margin: 0, display: "grid", gap: 8 }}>
          <figcaption style={{ font: "500 13px var(--font)", color: "var(--ink-2)" }}>{label} · {width} px</figcaption>
          <DemoTile key={`${alarm}-${footprint}`} alarm={alarm} width={width} footprint={footprint} readOnly={readOnly} />
        </figure>
      ))}
    </div>
  ),
};

export const CompactAllStates: Story = {
  name: "Compact, all states",
  parameters: { layout: "padded", controls: { include: ["width", "readOnly"] } },
  args: { width: 380 },
  render: ({ width, readOnly }) => (
    <div style={{ display: "grid", gap: 8, width, maxWidth: "100%" }}>
      {ALARMS.map((alarm) => <DemoTile key={alarm} alarm={alarm} footprint="compact" readOnly={readOnly} />)}
    </div>
  ),
};

/** For panels Home Assistant can read but not control, like a Ring Alarm without a subscription. */
export const ViewOnly: Story = { name: "View only (Ring)", args: { alarm: "ring", readOnly: true } };
export const ViewOnlyAllStates: Story = { ...AllStates, name: "View only, all states", args: { readOnly: true } };
export const ViewOnlyCompact: Story = { ...CompactAllStates, name: "View only, compact", args: { width: 380, readOnly: true } };
export const ViewOnlySheet: Story = { name: "View only, details sheet", args: { alarm: "ring", readOnly: true, defaultOpen: true } };

export const DetailsSheet: Story = { name: "Details sheet", args: { alarm: "openDoor", defaultOpen: true } };
export const DetailsSheetPhone: Story = {
  name: "Details sheet, phone",
  args: { alarm: "away", defaultOpen: true },
  parameters: { viewport: { defaultViewport: "mobile2" } },
};
