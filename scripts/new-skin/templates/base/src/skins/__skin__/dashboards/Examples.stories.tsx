import type { Meta, StoryObj } from "@storybook/react";
import { __Skin__CardFrame } from "../shared/ui";
import { __Skin__Page, __Skin__Section } from "./layout";

const meta = { title: "__Section__/Dashboards/Examples", parameters: { layout: "fullscreen" } } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

function Example({ compact = false }: { compact?: boolean }) {
  return (
    <__Skin__Page title="Home" subtitle="Neutral generated baseline" showTime now={new Date(2026, 9, 17, 11, 54)}>
      <__Skin__Section title="Start here" note="Replace the visual language, keep the contracts" footprint={compact ? "compact" : "standard"}>
        <__Skin__CardFrame name="Example Card" area="Living room" state="on" summary="Ready" footprint={compact ? "compact" : "standard"} />
      </__Skin__Section>
    </__Skin__Page>
  );
}

export const Phone: Story = { render: () => <div style={{ width: 390, maxWidth: "100%", margin: "0 auto" }}><Example compact /></div> };
export const Tablet: Story = { render: () => <Example /> };
export const WallPanel: Story = { name: "Wall panel", render: () => <Example /> };
