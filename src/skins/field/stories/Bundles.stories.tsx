import type { Meta, StoryObj } from "@storybook/react";
import { NotInField } from "./NotInField";

const meta = { title: "Field/Bundles", parameters: { layout: "padded" } } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

/** Field has no bundles: docs/field.md defines no way to draw several cards as one. */
export const NotInThisSkin: Story = {
  name: "Not in Field",
  render: () => (
    <NotInField>
      Field has no bundles. Orb draws several cards as one outer card (joined, lead and titled bundles); docs/field.md
      defines no Field equivalent, so this group stays empty until it does.
    </NotInField>
  ),
};
