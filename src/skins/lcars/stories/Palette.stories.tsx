import type { Meta, StoryObj } from "@storybook/react";

const meta = { title: "Studies/Lcars/Foundations/Palette", parameters: { layout: "padded" } } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const roles = [
  ["Page", "--lcars-page"], ["Card", "--lcars-card"], ["Muted surface", "--lcars-card-muted"], ["Ink", "--lcars-ink"], ["Muted ink", "--lcars-ink-muted"], ["Accent", "--lcars-accent"],
] as const;
export const Roles: Story = { render: () => <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>{roles.map(([label, token]) => <figure key={token} style={{ margin: 0 }}><div style={{ height: 90, border: "1px solid var(--lcars-line)", borderRadius: 12, background: `var(${token})` }} /><figcaption style={{ marginTop: 8, color: "var(--lcars-ink-muted)", fontSize: 12 }}>{label}<br /><code>{token}</code></figcaption></figure>)}</div> };
