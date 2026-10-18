import type { Meta, StoryObj } from "@storybook/react";
import { kelvinName, lampColor } from "../widgets/light/kelvin";

const meta = {
  title: "Foundations/Color temperature",
  parameters: {
    layout: "padded",
    docs: { description: { component: "The lamp color is derived from the light's Kelvin value. Lightness comes from the theme, so it holds up in light and dark." } },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const STEPS = [2200, 2700, 3000, 3500, 4000, 4500, 5000, 5500, 6000, 6500];

export const Scale: Story = {
  render: () => (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 12, maxWidth: 720, fontFamily: "var(--font)" }}>
      {STEPS.map((k) => (
        <div key={k} style={{ display: "grid", gap: 8, padding: 12, borderRadius: 20, background: "var(--card)", boxShadow: "inset 0 0 0 1px var(--card-edge)" }}>
          <div style={{ height: 44, borderRadius: 99, background: lampColor(k) }} />
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>{k} K</div>
          <div style={{ fontSize: 12.5, fontWeight: 500, color: "var(--ink-2)" }}>{kelvinName(k)}</div>
        </div>
      ))}
    </div>
  ),
};
