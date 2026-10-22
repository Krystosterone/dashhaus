import type { Meta, StoryObj } from "@storybook/react";
import type { CSSProperties, ReactNode } from "react";
import { COLORS } from "../shared/ui";

const meta = {
  title: "Foundations/Palette",
  parameters: {
    layout: "padded",
    docs: { description: { component: "One palette for every widget. Change the accent with --brand-c / --brand-h in tokens.css, or try the Accent toolbar." } },
  },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const chip: CSSProperties = { height: 44, borderRadius: 99, boxShadow: "inset 0 0 0 1px var(--line)" };
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
      <Role title="Neutrals" rule="Everything, by default: cards, readings, idle controls.">
        <div style={{ display: "flex", gap: 6 }}>{["var(--card-solid)", "var(--fill)", "var(--chip)"].map((c) => <div key={c} style={{ ...chip, flex: 1, background: c }} />)}</div>
      </Role>
      <Role title="Solid accent: on, energy" rule="Lit, running, daylight, sunshine. The only solid fill, the glow, the now stick and the page wash. One token.">
        <div style={{ ...chip, background: "oklch(var(--accent-l) var(--brand-c) var(--brand-h))", boxShadow: "none" }} />
      </Role>
      <Role title="Soft accent: on, not energy" rule="A mode switched on, an armed alarm, a thermostat on but idle, a door left open, a selected chip. Same hue, so on always reads as on.">
        <div style={{ ...chip, background: "color-mix(in oklab, oklch(var(--accent-l) var(--brand-c) var(--brand-h)) var(--on-mix), var(--card-solid))", boxShadow: "inset 0 0 0 1.5px oklch(var(--accent-strong-l) var(--brand-c) var(--brand-h) / var(--on-ring-a))" }} />
      </Role>
      <Role title="Hatching: off" rule="Off, closed, disarmed, unavailable, resting.">
        <div style={{ ...chip, background: "repeating-linear-gradient(-45deg, var(--hatch) 0 1.2px, transparent 1.2px 6px), var(--track)" }} />
      </Role>
      <Role title="Inverse: actions only" rule="Stop, Disarm, Cancel, Enter. A button to press, never a state.">
        <div style={{ ...chip, width: 96, background: "var(--inv-bg)", color: "var(--inv-fg)", boxShadow: "none", display: "grid", placeItems: "center", fontWeight: 600, fontSize: 13.5 }}>Stop</div>
      </Role>
      <Role title="Warn: text only" rule="Low battery, a door left open, poor air, strong gusts.">
        <span style={{ color: "var(--warn)", fontWeight: 600, fontSize: 15 }}>Battery 8%</span>
      </Role>
      <Role title="Colour slot: the orb only" rule="A widget's own colour, never a fill. On by default only where colour is data: a lamp's colour temperature, heat or cool. Otherwise opt in with color.">
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {Object.entries(COLORS).map(([name, c]) => (
            <div key={name} title={name} style={{ width: 34, height: 34, borderRadius: "50%", background: `oklch(var(--accent-l) ${c.c} ${c.h})` }} />
          ))}
        </div>
      </Role>
    </div>
  ),
};
