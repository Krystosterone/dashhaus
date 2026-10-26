import type { Meta, StoryObj } from "@storybook/react";
import type { CSSProperties, ReactNode } from "react";
import { COLORS } from "../shared/ui";

const meta = {
  title: "Orb/Foundations/Palette",
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "One UI language for every widget: shape says what you can do, fill says state, a dashed outline says unavailable. " +
          "Change the accent with --brand-c / --brand-h in tokens.css, or try the Accent toolbar.",
      },
    },
  },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const pill: CSSProperties = { height: 44, borderRadius: 99, display: "grid", placeItems: "center", fontSize: 14, fontWeight: 600 };
function Role({ title, rule, children }: { title: string; rule: string; children: ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "180px minmax(0, 1fr)", gap: 16, alignItems: "center", padding: "14px 0", borderTop: "1px solid var(--line)" }}>
      <div>{children}</div>
      <div style={{ display: "grid", gap: 2 }}>
        <b style={{ fontSize: 15, fontWeight: 600 }}>{title}</b>
        <span style={{ fontSize: 13.5, color: "var(--ink-2)" }}>{rule}</span>
      </div>
    </div>
  );
}

export const Roles: Story = {
  render: () => (
    <div style={{ maxWidth: 720, fontFamily: "var(--font)", color: "var(--ink)" }}>
      <Role title="Button: tap it" rule="Raised. Orbs, toggle pills, stepper and open/close buttons, chips, keys. Off is this surface, nothing more.">
        <div style={{ ...pill, background: "var(--btn)", boxShadow: "var(--btn-shadow)" }}>Off</div>
      </Role>
      <Role title="Groove: slide or set along it" rule="Recessed. Brightness, curtains and shades, the heat/cool range, the setpoint stepper, the alarm's mode switch.">
        <div style={{ ...pill, justifyItems: "start", paddingLeft: 16, background: "var(--groove)", boxShadow: "var(--groove-shadow)", color: "var(--ink-2)" }}>Off</div>
      </Role>
      <Role title="Readout: look at it" rule="No container. Sensor readings, today's temperatures, a view-only alarm. Nothing that can't be pressed looks pressable.">
        <div style={{ ...pill, justifyItems: "start", fontSize: 20, fontWeight: 700 }}>21.4°</div>
      </Role>
      <Role title="Solid accent: on" rule="Every on, whatever the role: lit, running, a mode, armed, open, a chosen chip. Energy adds the orb's bloom and the card's glow. One token.">
        <div style={{ ...pill, background: "oklch(var(--accent-l) var(--brand-c) var(--brand-h))", color: "var(--on-accent)" }}>On</div>
      </Role>
      <Role title="Dashed: unavailable" rule="A dashed outline and muted text, on the orb and the control alike. Nothing else is dashed.">
        <div style={{ ...pill, justifyItems: "start", paddingLeft: 16, outline: "1.5px dashed var(--ink-3)", outlineOffset: -1.5, color: "var(--ink-3)" }}>Unavailable</div>
      </Role>
      <Role title="Inverse: the urgent action" rule="Stop, Disarm, Cancel, Enter. A button to press, never a state.">
        <div style={{ ...pill, width: 96, background: "var(--inv-bg)", color: "var(--inv-fg)" }}>Stop</div>
      </Role>
      <Role title="Warn: text only" rule="Low battery, a door left open, poor air, strong gusts. A triggered alarm alone fills.">
        <span style={{ color: "var(--warn)", fontWeight: 600, fontSize: 15 }}>Battery 8%</span>
      </Role>
      <Role title="Colour slot: opt-in, the orb only" rule="No widget colours its orb by default. Pass color (or a toggle's own colour) to tint the orb on standard, featured and sheet surfaces; never a fill, never in compact rows.">
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {Object.entries(COLORS).map(([name, c]) => (
            <div key={name} title={name} style={{ width: 34, height: 34, borderRadius: "50%", background: `oklch(var(--accent-l) ${c.c} ${c.h})` }} />
          ))}
        </div>
      </Role>
    </div>
  ),
};
