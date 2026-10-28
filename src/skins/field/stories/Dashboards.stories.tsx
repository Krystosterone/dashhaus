import type { Meta, StoryObj } from "@storybook/react";
import { NotInField } from "./NotInField";

const meta = { title: "Field/Dashboards", parameters: { layout: "padded" } } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

/** Field has no composed layouts, header or nav bar of its own; its one dashboard comes from YAML. */
export const NotInThisSkin: Story = {
  name: "Not in Field",
  render: () => (
    <NotInField>
      Field has no hand-composed dashboard layouts, header or nav bar. Its one dashboard is its Lovelace card, which
      lays its cards out by area from YAML: see Field → Home Assistant → Dashboard.
    </NotInField>
  ),
};
