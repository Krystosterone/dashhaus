import type { Meta, StoryObj } from "@storybook/react";
import type { ReactNode } from "react";
import { DemoLightTile as Light } from "../cards/light/demo/DemoLightTile";
import { DemoClimateTile as Climate } from "../cards/climate/demo/DemoClimateTile";
import { DemoSensorTile as Sensor } from "../cards/sensor/demo/DemoSensorTile";
import { DemoWeatherTile as Weather } from "../cards/weather/demo/DemoWeatherTile";
import { DemoToggleTile as Toggle } from "../cards/toggle/demo/DemoToggleTile";
import { DemoCoverTile as Cover } from "../cards/cover/demo/DemoCoverTile";
import { DemoAlarmTile as Alarm } from "../cards/alarm/demo/DemoAlarmTile";
import { DemoLockTile as Lock } from "../cards/lock/demo/DemoLockTile";

/** Every card's compact row, with its control and without. */
function Rows({ showControl, width }: { showControl: boolean; width: number }) {
  const rows: ReactNode[] = [
    <Light key="l1" light="dimmable" footprint="compact" showControl={showControl} />,
    <Light key="l2" light="dimmableOff" footprint="compact" showControl={showControl} />,
    <Light key="l3" light="onOff" footprint="compact" showControl={showControl} />,
    <Climate key="c1" unit="heating" footprint="compact" showControl={showControl} />,
    <Climate key="c2" unit="range" footprint="compact" showControl={showControl} />,
    <Cover key="v1" cover="curtains" footprint="compact" showControl={showControl} />,
    <Cover key="v2" cover="garage" footprint="compact" showControl={showControl} />,
    <Toggle key="t1" mode="dnd" footprint="compact" showControl={showControl} />,
    <Toggle key="t2" mode="quiet" footprint="compact" showControl={showControl} />,
    <Alarm key="a1" alarm="away" footprint="compact" showControl={showControl} />,
    <Alarm key="a2" alarm="triggered" footprint="compact" showControl={showControl} />,
    <Lock key="k1" seed="locked" footprint="compact" showControl={showControl} />,
    <Lock key="k2" seed="jammed" footprint="compact" showControl={showControl} />,
    <Sensor key="s1" sensor="living" footprint="compact" showControl={showControl} />,
    <Weather key="h1" weather="partly" footprint="compact" showControl={showControl} />,
    <Light key="l4" light="unavailable" footprint="compact" showControl={showControl} />,
  ];
  return <div style={{ display: "grid", gap: 8, width, maxWidth: "100%" }}>{rows}</div>;
}

function Compare({ width }: { width: number }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 32, alignItems: "flex-start" }}>
      {[true, false].map((c) => (
        <figure key={String(c)} style={{ margin: 0, display: "grid", gap: 10 }}>
          <figcaption style={{ font: "500 13px var(--font)", color: "var(--ink-2)" }}>{c ? "showControl (default)" : "showControl={false}"}</figcaption>
          <Rows showControl={c} width={width} />
        </figure>
      ))}
    </div>
  );
}

const meta = {
  title: "Orb/Foundations/Compact rows",
  component: Compare,
  parameters: {
    layout: "padded",
    docs: { description: { component: "Every 60px compact card can hide its control (showControl={false}): the value replaces it and the row opens details. All card types keep the same anatomy and rhythm." } },
  },
  argTypes: { width: { control: { type: "range", min: 240, max: 560, step: 2 } } },
  args: { width: 380 },
} satisfies Meta<typeof Compare>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithAndWithout: Story = { name: "With and without the control" };
