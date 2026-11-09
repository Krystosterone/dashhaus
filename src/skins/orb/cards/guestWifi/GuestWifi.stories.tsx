import type { Meta, StoryObj } from "@storybook/react";
import { DemoGuestWifiTile as DemoTile } from "./demo/DemoGuestWifiTile";
import { GUEST_WIFI_WORST_CASE } from "@dashhaus/core/seeds/guestWifi";

const SIZES = { S: 174, M: 360, L: 464 } as const;
const SEEDS = ["ready", "shared", "unlimited", "password", "qrFails", "none", "unavailable", "long", "bare", "passphrase"] as const;

const meta = {
  title: "Orb/Cards/GuestWifi",
  component: DemoTile,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "A guest Wi-Fi network and what a guest types: a code its page asks for (UniFi Hotspot Manager's `sensor.*_voucher`, " +
          "with its join QR code and buttons found beside it), or its password (an `input_text`, with whatever QR code and " +
          "actions the host names). A reading: a bare icon, the code as a readout with no container, and no glow; the status " +
          "line names the network. Featured, the card carries the join QR code. Tap the code or the name for the sheet: the QR " +
          "code large, what the code allows, and Refresh and New code (New password asks first). Same sizes and heights as the other cards.",
      },
    },
  },
  argTypes: {
    seed: { control: "select", options: SEEDS, description: "Example code" },
    width: { control: { type: "range", min: 160, max: 640, step: 2 }, description: "Container width in px" },
    footprint: { control: "inline-radio", options: ["compact", "standard", "featured"] },
    showControl: { control: "boolean", description: "Compact only: show the code in the row (off: the row opens details)" },
    defaultOpen: { control: "boolean", description: "Open the detail sheet on load" },
  },
  args: { seed: "ready", width: SIZES.M, footprint: "standard" },
  render: (args) => <DemoTile key={`${args.seed}-${args.defaultOpen}`} {...args} />,
} satisfies Meta<typeof DemoTile>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Ready: Story = {};
/** A code for five guests, two of whom have joined: its sheet says how many uses and how long it has left. */
export const InUse: Story = { name: "In use", args: { seed: "shared" } };
export const Unlimited: Story = { name: "Unlimited uses", args: { seed: "unlimited" } };
/** A network with a Wi-Fi password, kept in an `input_text`: Password, and New password asks first in the sheet. */
export const Password: Story = { args: { seed: "password" } };
/** Every code has been used: nothing to give until one is made in the sheet. */
export const NoCode: Story = { name: "No code", args: { seed: "none" } };
/** The hero for a hall or a wall panel: the join QR code on the card, to scan where you stand. */
export const Featured: Story = { args: { footprint: "featured" } };
/** Featured with every code used: no QR code to scan, and the one place outside the sheet that says to make one there. */
export const FeaturedNoCode: Story = { name: "Featured, no code", args: { seed: "none", footprint: "featured" } };
export const Unavailable: Story = { args: { seed: "unavailable" } };
/** Realistic worst-case data from the demo seeds (GUEST_WIFI_WORST_CASE): long names, uses at their limits, no network or QR code. */
export const WorstCase: Story = {
  name: "Worst case",
  parameters: { layout: "padded", controls: { include: ["width", "footprint"] } },
  render: ({ width, footprint }) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-start" }}>
      {GUEST_WIFI_WORST_CASE.map((seed, index) => <DemoTile key={index} seed={seed} width={width} footprint={footprint} />)}
    </div>
  ),
};

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
          <figcaption style={{ font: "500 13px var(--font)", color: "var(--ink-2)" }}>{label} · {width} px</figcaption>
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

export const Compact: Story = {
  name: "Compact",
  parameters: { layout: "padded", controls: { include: ["width"] } },
  args: { width: 360 },
  render: ({ width }) => (
    <div style={{ display: "grid", gap: 8, width, maxWidth: "100%" }}>
      {SEEDS.map((seed) => <DemoTile key={seed} seed={seed} footprint="compact" />)}
      {SEEDS.map((seed) => <DemoTile key={`${seed}-bare`} seed={seed} footprint="compact" showControl={false} />)}
    </div>
  ),
};

export const Details: Story = { name: "Details", args: { defaultOpen: true } };
export const DetailsNoCode: Story = { name: "Details, no code", args: { seed: "none", defaultOpen: true } };
export const DetailsPassword: Story = { name: "Details, password", args: { seed: "password", defaultOpen: true } };
/** The join QR code fails to load: its frame stays empty, never the browser's broken picture, and its line says so. */
export const DetailsQrCodeFails: Story = { name: "Details, QR code fails", args: { seed: "qrFails", defaultOpen: true } };
export const DetailsUnavailable: Story = { name: "Details, unavailable", args: { seed: "unavailable", defaultOpen: true } };
export const DetailsPhone: Story = {
  name: "Details, phone",
  args: { defaultOpen: true },
  parameters: { viewport: { defaultViewport: "mobile2" } },
};
