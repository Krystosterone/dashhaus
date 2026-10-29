import type { Meta, StoryObj } from "@storybook/react";
import { Header } from "./Header";

/** Fixed so screenshots stay stable; the Live story runs the real clock. */
const NOW = new Date(2026, 9, 17, 11, 54);
/** A page's content width on each device, after its 16 px gutters. */
const WIDTHS = { Phone: 358, Tablet: 1148, "Wall panel": 1240 } as const;

const caption = { font: "600 11px var(--fd-sans)", fontStretch: "var(--fd-wide)", letterSpacing: "0.06em", color: "var(--fd-ink-2)" } as const;

const meta = {
  title: "Field/Dashboards/Header",
  component: Header,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "The top of a field page: its name printed large, today's date under it in small print, and an optional clock on a strip of screen " +
          "as tall as a control row. Not a module: print on the page, the clock the one thing lit. The clock ticks on the minute, its digits " +
          "in fixed places (a 12-hour clock's first one an unlit segment before 10), so nothing shifts as the time changes.",
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
  render: (args) => <div style={{ width: WIDTHS.Tablet, maxWidth: "100%" }}><Header {...args} /></div>,
} satisfies Meta<typeof Header>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithTime: Story = { name: "With time" };
export const DateOnly: Story = { name: "Date only", args: { showTime: false } };
/** Before ten, the hour's first place is an unlit segment, so 9:05 and 12:59 are the same width. */
export const TwelveHour: Story = { name: "12-hour", args: { hourCycle: "h12", now: new Date(2026, 9, 17, 9, 5) } };
export const Subtitle: Story = { args: { title: "Nursery", subtitle: "Night · quiet", showTime: false } };
export const Live: Story = { args: { now: undefined } };

export const Sizes: Story = {
  parameters: { controls: { include: ["title", "showTime", "hourCycle", "locale"] } },
  render: (args) => (
    <div style={{ display: "grid", gap: 28 }}>
      {Object.entries(WIDTHS).map(([label, w]) => (
        <figure key={label} style={{ margin: 0, display: "grid", gap: 10, width: w, maxWidth: "100%" }}>
          <figcaption style={caption}>{label.toUpperCase()} · {w} PX</figcaption>
          <Header {...args} />
        </figure>
      ))}
    </div>
  ),
};

/** Realistic hard cases: a long name, a long localised date, AM/PM, a time zone that isn't the device's, a one-letter name. */
export const WorstCase: Story = {
  name: "Worst case",
  render: () => (
    <div style={{ display: "grid", gap: 28 }}>
      {[WIDTHS.Phone, WIDTHS.Tablet].map((w) => (
        <div key={w} style={{ display: "grid", gap: 22, width: w, maxWidth: "100%" }}>
          <Header title="Résidence secondaire, Sainte-Anne-des-Plaines" showTime hourCycle="h12" now={new Date(2026, 8, 30, 12, 59)} />
          <Header title="Wohnzimmer" locale="de-DE" showTime now={new Date(2026, 8, 30, 9, 5)} />
          <Header title="Chalet" locale="fr-CA" showTime timeZone="America/Vancouver" now={new Date(2026, 9, 17, 23, 54)} />
          <Header title="Jo" showTime now={NOW} />
        </div>
      ))}
    </div>
  ),
};
