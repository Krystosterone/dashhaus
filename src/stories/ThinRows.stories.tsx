import type { Meta, StoryObj } from "@storybook/react";
import type { ReactNode } from "react";
import { DemoLightTile as Light } from "../widgets/light/demo/DemoLightTile";
import { DemoClimateTile as Climate } from "../widgets/climate/demo/DemoClimateTile";
import { DemoSensorTile as Sensor } from "../widgets/sensor/demo/DemoSensorTile";
import { DemoHomeTile as Home } from "../widgets/home/demo/DemoHomeTile";
import { DemoToggleTile as Toggle } from "../widgets/toggle/demo/DemoToggleTile";
import { DemoCoverTile as Cover } from "../widgets/cover/demo/DemoCoverTile";
import { DemoAlarmTile as Alarm } from "../widgets/alarm/demo/DemoAlarmTile";

/** Every widget's thin row, with its control and without. */
function Rows({ showControl, width }: { showControl: boolean; width: number }) {
  const rows: ReactNode[] = [
    <Light key="l1" light="dimmable" density="thin" showControl={showControl} />,
    <Light key="l2" light="dimmableOff" density="thin" showControl={showControl} />,
    <Light key="l3" light="onOff" density="thin" showControl={showControl} />,
    <Climate key="c1" unit="heating" density="thin" showControl={showControl} />,
    <Climate key="c2" unit="range" density="thin" showControl={showControl} />,
    <Cover key="v1" cover="curtains" density="thin" showControl={showControl} />,
    <Cover key="v2" cover="garage" density="thin" showControl={showControl} />,
    <Toggle key="t1" mode="dnd" density="thin" showControl={showControl} />,
    <Toggle key="t2" mode="quiet" density="thin" showControl={showControl} />,
    <Alarm key="a1" alarm="away" density="thin" showControl={showControl} />,
    <Alarm key="a2" alarm="triggered" density="thin" showControl={showControl} />,
    <Sensor key="s1" sensor="living" density="thin" showControl={showControl} />,
    <Home key="h1" weather="partly" density="thin" showControl={showControl} />,
    <Light key="l4" light="unavailable" density="thin" showControl={showControl} />,
  ];
  return <div style={{ display: "grid", gap: 8, width, maxWidth: "100%" }}>{rows}</div>;
}

function Compare({ width }: { width: number }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 32, alignItems: "flex-start" }}>
      {[true, false].map((c) => (
        <figure key={String(c)} style={{ margin: 0, display: "grid", gap: 10 }}>
          <figcaption style={{ font: "500 13px var(--font)", color: "var(--ink-3)" }}>{c ? "showControl (default)" : "showControl={false}"}</figcaption>
          <Rows showControl={c} width={width} />
        </figure>
      ))}
    </div>
  );
}

const meta = {
  title: "Foundations/Thin rows",
  component: Compare,
  parameters: {
    layout: "padded",
    docs: { description: { component: "Every thin row can hide its control (showControl={false}): the value shows as text in its place, and the whole row opens the details sheet. The orb still switches on tap and opens on hold." } },
  },
  argTypes: { width: { control: { type: "range", min: 240, max: 560, step: 2 } } },
  args: { width: 380 },
} satisfies Meta<typeof Compare>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithAndWithout: Story = { name: "With and without the control" };
