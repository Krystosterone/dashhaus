import type { Meta, StoryObj } from "@storybook/react";
import { GuestWifiModule } from "./GuestWifiModule";
import type { FieldFootprint } from "../../shared/ui";
import { GUEST_WIFI_SEEDS, GUEST_WIFI_WORST_CASE, useDemoGuestWifi } from "@dashhaus/core/seeds/guestWifi";
import type { GuestWifiSeed, GuestWifiSeedName } from "@dashhaus/core/seeds/guestWifi";

const SIZES = { S: 200, M: 340, L: 464 } as const;
const SEEDS = Object.keys(GUEST_WIFI_SEEDS) as GuestWifiSeedName[];

function DemoGuestWifi({ seed, width, footprint, defaultOpen }: { seed: GuestWifiSeed; width?: number; footprint?: FieldFootprint; defaultOpen?: boolean }) {
  const demo = useDemoGuestWifi(seed);
  return (
    <div style={{ width, maxWidth: "100%" }}>
      <GuestWifiModule {...demo} footprint={footprint} defaultOpen={defaultOpen} />
    </div>
  );
}

function StoryGuestWifi({ guestWifi, ...props }: { guestWifi: GuestWifiSeedName; width?: number; footprint?: FieldFootprint; defaultOpen?: boolean }) {
  return <DemoGuestWifi seed={GUEST_WIFI_SEEDS[guestWifi]} {...props} />;
}

const meta = {
  title: "Field/Cards/GuestWifi",
  component: StoryGuestWifi,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "A guest Wi-Fi network and its code (UniFi Hotspot Manager's `sensor.*_voucher`) or its password (an `input_text`) as a field module. A reading, so " +
          "nothing on it is pressed: its glyph lies flat where a key would be, the network printed beside it, the code on the " +
          "screen. Tap the name for the panel: the join QR code, and Refresh and New code. Standard modules are 160 px, compact rows 64 px.",
      },
    },
  },
  argTypes: {
    guestWifi: { control: "select", options: SEEDS, description: "Example code" },
    width: { control: { type: "range", min: 180, max: 640, step: 2 }, description: "Container width in px" },
    footprint: { control: "inline-radio", options: ["compact", "standard"], description: "Module height" },
    defaultOpen: { control: "boolean", description: "Open the detail panel on load" },
  },
  args: { guestWifi: "ready", width: SIZES.M, footprint: "standard" },
  render: (args) => <StoryGuestWifi key={`${args.guestWifi}-${args.defaultOpen}`} {...args} />,
} satisfies Meta<typeof StoryGuestWifi>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Ready: Story = {};
/** A code for five guests, two of whom have joined: three uses and 18 hours left. */
export const InUse: Story = { name: "In use", args: { guestWifi: "shared" } };
/** A network with a Wi-Fi password, kept in an `input_text`: shown as it is typed; New password asks first in the panel. */
export const Password: Story = { args: { guestWifi: "password" } };
/** Every code has been used: NONE in the dim ink, a known resting state, and a new one is made in the panel. */
export const NoCode: Story = { name: "No code", args: { guestWifi: "none" } };
/** Blank segments on the screen, and when it was last seen. */
export const Unavailable: Story = { args: { guestWifi: "unavailable" } };

/** Every slot at its widest: the worst-case seeds. */
export const WorstCase: Story = {
  name: "Worst case",
  parameters: { layout: "padded", controls: { include: ["width", "footprint"] } },
  render: ({ width, footprint }) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-start" }}>
      {GUEST_WIFI_WORST_CASE.map((seed) => <DemoGuestWifi key={seed.entity.entityId} seed={seed} width={width} footprint={footprint} />)}
    </div>
  ),
};

/** Every example at one width. Heights match, whatever the state. */
export const AllStates: Story = {
  name: "All states",
  parameters: { layout: "padded", controls: { include: ["width", "footprint"] } },
  render: ({ width, footprint }) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-start" }}>
      {SEEDS.map((name) => <StoryGuestWifi key={name} guestWifi={name} width={width} footprint={footprint} />)}
    </div>
  ),
};

/** The same code at S, M and L container widths. */
export const Sizes: Story = {
  parameters: { layout: "padded", controls: { include: ["guestWifi", "footprint"] } },
  render: ({ guestWifi, footprint }) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 24, alignItems: "flex-start" }}>
      {(Object.entries(SIZES) as [keyof typeof SIZES, number][]).map(([label, width]) => (
        <figure key={label} style={{ margin: 0, display: "grid", gap: 8 }}>
          <figcaption style={{ font: "600 11px var(--fd-sans)", letterSpacing: "0.06em", color: "var(--fd-ink-2)" }}>{label} · {width} PX</figcaption>
          <StoryGuestWifi key={guestWifi} guestWifi={guestWifi} width={width} footprint={footprint} />
        </figure>
      ))}
    </div>
  ),
};

/** The same entity at both footprints, the 64 px row and the 160 px module, at one width. */
export const Footprints: Story = {
  parameters: { layout: "padded", controls: { include: ["guestWifi", "width"] } },
  render: ({ guestWifi, width }) => (
    <div style={{ display: "grid", gap: 8, width, maxWidth: "100%" }}>
      {(["compact", "standard"] as const).map((footprint) => <StoryGuestWifi key={footprint} guestWifi={guestWifi} footprint={footprint} />)}
    </div>
  ),
};

/** Every example as a 64 px row, stacked as a phone's column would be. */
export const Compact: Story = {
  args: { footprint: "compact" },
  parameters: { layout: "padded", controls: { include: ["width"] } },
  render: ({ width }) => (
    <div style={{ display: "grid", gap: 8, width, maxWidth: "100%" }}>
      {SEEDS.map((name) => <StoryGuestWifi key={name} guestWifi={name} footprint="compact" />)}
    </div>
  ),
};

/** The detail panel: the screen, the join QR code and how to join, then Refresh and New code. */
export const Details: Story = { args: { defaultOpen: true } };

/** A password: its QR code joins with it, and New password asks first. */
export const DetailsPassword: Story = { name: "Details, password", args: { guestWifi: "password", defaultOpen: true } };

/** No code to give: the panel offers a new one. */
export const DetailsNoCode: Story = { name: "Details, no code", args: { guestWifi: "none", defaultOpen: true } };

/** Unavailable: blank segments and when it was last seen; nothing to press. */
export const DetailsUnavailable: Story = { name: "Details, unavailable", args: { guestWifi: "unavailable", defaultOpen: true } };

/** On a phone the panel is a bottom sheet: drag its header down to close. */
export const DetailsPhone: Story = {
  name: "Details, phone",
  args: { defaultOpen: true },
  parameters: { viewport: { defaultViewport: "mobile2" } },
};
