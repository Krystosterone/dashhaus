import type { Meta, StoryObj } from "@storybook/react";

const meta = { title: "Studies/Glasshouse/Foundations/Palette", parameters: { layout: "padded" } } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const roles = [
  ["Page", "--glasshouse-page"], ["Card", "--glasshouse-card"], ["Muted surface", "--glasshouse-card-muted"], ["Ink", "--glasshouse-ink"], ["Muted ink", "--glasshouse-ink-muted"], ["Accent", "--glasshouse-accent"],
] as const;
export const Roles: Story = { render: () => <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>{roles.map(([label, token]) => <figure key={token} style={{ margin: 0 }}><div style={{ height: 90, border: "1px solid var(--glasshouse-line)", borderRadius: 12, background: `var(${token})` }} /><figcaption style={{ marginTop: 8, color: "var(--glasshouse-ink-muted)", fontSize: 12 }}>{label}<br /><code>{token}</code></figcaption></figure>)}</div> };
