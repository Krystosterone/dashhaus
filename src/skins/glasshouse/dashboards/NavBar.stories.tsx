import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { GlasshouseNavBar } from "./NavBar";

function Demo() {
  const [current, setCurrent] = useState("home");
  const items = ["Home", "Living room", "Nursery", "Outside"].map((label) => ({ key: label.toLowerCase(), label, kind: "page" as const, current: current === label.toLowerCase(), onSelect: () => setCurrent(label.toLowerCase()) }));
  return <GlasshouseNavBar items={items} />;
}

const meta = { title: "Studies/Glasshouse/Dashboards/Nav bar", parameters: { layout: "centered" } } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
export const Pages: Story = { render: () => <Demo /> };
