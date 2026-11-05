import type { Meta, StoryObj } from "@storybook/react";

const meta = { title: "Studies/Titan/Foundations/Palette", parameters: { layout: "padded" } } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const roles = [
  ["Page", "--titan-page"], ["Card", "--titan-card"], ["Muted surface", "--titan-card-muted"], ["Ink", "--titan-ink"], ["Muted ink", "--titan-ink-muted"], ["Accent", "--titan-accent"],
] as const;
export const Roles: Story = { render: () => <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>{roles.map(([label, token]) => <figure key={token} style={{ margin: 0 }}><div style={{ height: 90, border: "1px solid var(--titan-line)", borderRadius: 12, background: `var(${token})` }} /><figcaption style={{ marginTop: 8, color: "var(--titan-ink-muted)", fontSize: 12 }}>{label}<br /><code>{token}</code></figcaption></figure>)}</div> };
