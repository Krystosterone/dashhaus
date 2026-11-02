import type { Meta, StoryObj } from "@storybook/react";
import { FuturaHeader } from "./Header";

const meta = {
  title: "Studies/Futura/Dashboards/Header",
  component: FuturaHeader,
  parameters: { layout: "padded" },
  args: { title: "Home", showTime: true, now: new Date(2026, 9, 17, 11, 54) },
} satisfies Meta<typeof FuturaHeader>;
export default meta;
type Story = StoryObj<typeof meta>;

export const WithTime: Story = { name: "With time" };
export const DateOnly: Story = { name: "Date only", args: { showTime: false } };
export const WorstCase: Story = { name: "Worst case", args: { title: "Résidence secondaire, Sainte-Anne-des-Plaines", hourCycle: "h12" } };
