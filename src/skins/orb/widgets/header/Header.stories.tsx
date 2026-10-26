import type { Meta, StoryObj } from "@storybook/react";
import { HeaderWidget } from "./HeaderWidget";

/** Fixed so screenshots stay stable; the Live story runs the real clock. */
const NOW = new Date(2026, 9, 17, 11, 54);
const WIDTHS = { Phone: 358, Tablet: 1148, "Wall panel": 1248 } as const;

const meta = {
  title: "Orb/Widgets/Header",
  component: HeaderWidget,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "The top of a dashboard: its name, today's date under it, and an optional clock on the right. Not a card: type on the page surface, " +
          "sized from its own width. The clock ticks on the minute (and catches up when a sleeping tablet wakes), in tabular figures so nothing shifts.",
      },
    },
  },
  argTypes: {
    title: { control: "text" },
    subtitle: { control: "text", description: "Replaces the date" },
    showTime: { control: "boolean" },
    hourCycle: { control: "inline-radio", options: [undefined, "h12", "h23"] },
    locale: { control: "select", options: [undefined, "en-CA", "en-US", "fr-CA", "de-DE"] },
    timeZone: { control: "text" },
  },
  args: { title: "Home", showTime: true, now: NOW },
  render: (args) => <div style={{ width: 1148, maxWidth: "100%" }}><HeaderWidget {...args} /></div>,
} satisfies Meta<typeof HeaderWidget>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithTime: Story = { name: "With time" };
export const DateOnly: Story = { name: "Date only", args: { showTime: false } };
export const TwelveHour: Story = { name: "12-hour", args: { hourCycle: "h12" } };
export const Subtitle: Story = { args: { title: "Living room", subtitle: "Comfortable · 21.4°", showTime: false } };
export const Live: Story = { args: { now: undefined } };

export const Sizes: Story = {
  parameters: { controls: { include: ["title", "showTime", "hourCycle", "locale"] } },
  render: (args) => (
    <div style={{ display: "grid", gap: 28 }}>
      {Object.entries(WIDTHS).map(([label, w]) => (
        <figure key={label} style={{ margin: 0, display: "grid", gap: 10, width: w, maxWidth: "100%" }}>
          <figcaption style={{ font: "500 13px var(--font)", color: "var(--ink-2)" }}>{label} · {w} px</figcaption>
          <HeaderWidget {...args} />
        </figure>
      ))}
    </div>
  ),
};

/** Realistic hard cases: a long name, a long localised date, AM/PM, a time zone that isn't the device's. */
export const WorstCase: Story = {
  name: "Worst case",
  render: () => (
    <div style={{ display: "grid", gap: 28 }}>
      {[358, 1148].map((w) => (
        <div key={w} style={{ display: "grid", gap: 22, width: w, maxWidth: "100%" }}>
          <HeaderWidget title="Résidence secondaire, Sainte-Anne-des-Plaines" showTime hourCycle="h12" now={new Date(2026, 8, 30, 12, 59)} />
          <HeaderWidget title="Wohnzimmer" locale="de-DE" showTime now={new Date(2026, 8, 30, 9, 5)} />
          <HeaderWidget title="Chalet" locale="fr-CA" showTime timeZone="America/Vancouver" now={new Date(2026, 9, 17, 23, 54)} />
          <HeaderWidget title="Jo" showTime now={NOW} />
        </div>
      ))}
    </div>
  ),
};
