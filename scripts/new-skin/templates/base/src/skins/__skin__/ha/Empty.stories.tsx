import type { Meta, StoryObj } from "@storybook/react";

const meta = {
  title: "__Section__/Connected",
  parameters: { layout: "centered" },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

/** Connected stories appear as real domains are added. */
export const NoConnectedCardsYet: Story = { name: "No Connected Cards yet", render: () => <p className="__skin__-empty">Add a Card to exercise its shared Home Assistant hook here.</p> };
