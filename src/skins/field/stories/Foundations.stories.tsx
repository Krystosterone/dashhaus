import type { Meta, StoryObj } from "@storybook/react";
import { NotInField } from "./NotInField";

const meta = { title: "Field/Foundations", parameters: { layout: "padded" } } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

/** Field has no cross-card foundation stories yet. */
export const NotInThisSkin: Story = {
  name: "Not in Field",
  render: () => (
    <NotInField>
      Field has no foundation stories yet. Its rules are written in docs/field.md and checked by
      src/skins/field/styles/rules.test.ts, and each card carries its own Worst case story. A palette or a cross-card
      worst-case page, as Orb has, would belong here.
    </NotInField>
  ),
};
