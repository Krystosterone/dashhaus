import type { Meta, StoryObj } from "@storybook/react";

const meta = { title: "__Stories__/Foundations/Palette", parameters: { layout: "padded" } } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const roles = [
  ["Page", "--__skin__-page"], ["Card", "--__skin__-card"], ["Muted surface", "--__skin__-card-muted"], ["Ink", "--__skin__-ink"], ["Muted ink", "--__skin__-ink-muted"], ["Accent", "--__skin__-accent"],
] as const;
export const Roles: Story = { render: () => <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>{roles.map(([label, token]) => <figure key={token} style={{ margin: 0 }}><div style={{ height: 90, border: "1px solid var(--__skin__-line)", borderRadius: 12, background: `var(${token})` }} /><figcaption style={{ marginTop: 8, color: "var(--__skin__-ink-muted)", fontSize: 12 }}>{label}<br /><code>{token}</code></figcaption></figure>)}</div> };
