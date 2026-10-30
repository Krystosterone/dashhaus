import type { Meta, StoryObj } from "@storybook/react";

const meta = {
  title: "__Section__/Cards",
  parameters: { layout: "centered" },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

/** Add the first real entity with `npm run new-card -- light --skin __skin__`. */
export const NoCardsYet: Story = { name: "No Cards yet", render: () => <p className="__skin__-empty">No Cards yet. Add one with the normal Card generator.</p> };
