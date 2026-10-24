import type { Meta, StoryObj } from "@storybook/react";
import type { ReactNode } from "react";
import { DashboardPage, Section, Columns, WidgetGrid, Cell } from "./layout";
import { DemoLightTile as Light } from "../widgets/light/demo/DemoLightTile";
import { DemoClimateTile as Climate } from "../widgets/climate/demo/DemoClimateTile";
import { DemoSensorTile as Sensor } from "../widgets/sensor/demo/DemoSensorTile";
import { DemoWeatherTile as Weather } from "../widgets/weather/demo/DemoWeatherTile";
import { DemoToggleTile as Toggle } from "../widgets/toggle/demo/DemoToggleTile";
import { DemoCoverTile as Cover } from "../widgets/cover/demo/DemoCoverTile";
import { DemoAlarmTile as Alarm } from "../widgets/alarm/demo/DemoAlarmTile";
import { DemoOwletTile as Owlet } from "../widgets/owlet/demo/DemoOwletTile";
import { DemoHumidifierTile as Humidifier } from "../widgets/humidifier/demo/DemoHumidifierTile";
import { DemoBundle as Bundle } from "../bundles/demo/DemoBundle";

/** A device-sized frame so each dashboard is seen at its real width. The content scrolls inside. */
function Device({ label, width, height, children }: { label: string; width: number; height: number; children: ReactNode }) {
  return (
    <figure style={{ margin: "24px auto", width, maxWidth: "100%", display: "grid", gap: 8 }}>
      <figcaption style={{ font: "500 13px var(--font)", color: "var(--ink-2)", paddingInline: 8 }}>{label} · {width} × {height}</figcaption>
      <div style={{ height, overflowY: "auto", borderRadius: 36, boxShadow: "inset 0 0 0 1px var(--line), var(--shadow)" }}>{children}</div>
    </figure>
  );
}

/** The example time, fixed so screenshots stay stable. */
const NOW = new Date(2026, 9, 17, 11, 54);

const meta = {
  title: "Dashboards",
  parameters: {
    layout: "fullscreen",
    docs: { description: { component: "Weather, security, modes, bundles, lights, covers, climate, sensors and the baby's sock composed per device. Example data; the time is fixed at 11:54." } },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Phone: frequent actions first, then whole-home status and room readings. Compact controls and
    bundles keep the shared 60px rhythm while secondary demo-only variants stay out of the overview. */
function PhoneDashboard() {
  return (
    <Device label="Phone" width={390} height={844}>
      <DashboardPage title="Home" now={NOW}>
        <Section title="Quick actions" columns={2}>
          <Cell span={2}><Bundle bundle="nightLight" /></Cell>
          <Cell span={2}><Bundle bundle="sleep" /></Cell>
          <Toggle mode="quiet" footprint="compact" />
          <Toggle mode="guest" footprint="compact" />
          <Cover cover="curtains" footprint="compact" />
          <Cover cover="garage" footprint="compact" />
          <Light light="dimmable" footprint="compact" />
          <Humidifier seed="on" footprint="compact" />
        </Section>
        <Section title="Home status">
          <Alarm alarm="ring" readOnly footprint="compact" />
          <Climate unit="heating" footprint="compact" />
          <Owlet seed="deep" />
          <Climate unit="nurseryDyson" footprint="compact" />
        </Section>
        <Section title="Rooms" columns={2}>
          <Sensor sensor="living" />
          <Sensor sensor="bedroom" />
          <Sensor sensor="bathroom" />
          <Sensor sensor="basement" />
        </Section>
      </DashboardPage>
    </Device>
  );
}

export const Phone: Story = { render: () => <PhoneDashboard /> };

/** Tablet, landscape: a single action hero and its supporting controls lead, followed by household
    status and nursery state, then the outside and room glance. */
export const Tablet: Story = {
  render: () => (
    <Device label="Tablet, landscape" width={1180} height={820}>
      <DashboardPage title="Home" now={NOW} showTime>
        <Section title="Quick actions" columns={2}>
          <Light light="dimmable" footprint="featured" />
          <WidgetGrid columns={2}>
            <Cell span={2}><Bundle bundle="sleep" /></Cell>
            <Toggle mode="quiet" footprint="compact" />
            <Toggle mode="guest" footprint="compact" />
            <Light light="dimmableOff" footprint="compact" />
            <Light light="dimmableNoWarmth" footprint="compact" />
            <Cover cover="curtains" footprint="compact" />
            <Cover cover="garage" footprint="compact" />
          </WidgetGrid>
        </Section>
        <Columns columns={2}>
          <Section title="Home status">
            <Alarm alarm="ring" readOnly footprint="compact" />
            <Climate unit="heating" />
            <Climate unit="cooling" footprint="compact" />
            <Climate unit="range" footprint="compact" />
            <Climate unit="off" footprint="compact" />
          </Section>
          <Section title="Nursery" columns={2}>
            <Owlet seed="deep" />
            <Bundle bundle="nightLight" />
            <Bundle bundle="upstairs" />
          </Section>
        </Columns>
        <Columns columns={2}>
          <Section title="Outside">
            <Weather weather="partly" />
            <Light light="onOff" footprint="compact" />
            <Sensor sensor="garage" footprint="compact" />
          </Section>
          <Section title="Rooms" columns={2}>
            <Sensor sensor="living" />
            <Sensor sensor="bedroom" />
            <Sensor sensor="bathroom" />
            <Sensor sensor="basement" />
          </Section>
        </Columns>
      </DashboardPage>
    </Device>
  ),
};

/** Wall panel, landscape: one column per place, ordered actions, status, then glance. */
export const WallPanel: Story = {
  name: "Wall panel",
  render: () => (
    <Device label="Wall panel" width={1280} height={800}>
      <DashboardPage title="Home" now={NOW} showTime style={{ paddingBottom: 0 }}>
        <Columns columns={4} gap={16}>
          <Section title="Living room">
            <Light light="dimmable" footprint="featured" />
            <Cover cover="curtains" footprint="compact" />
            <Light light="dimmableOff" footprint="compact" />
            <Climate unit="heating" footprint="compact" />
            <Sensor sensor="living" name="Air" />
          </Section>
          <Section title="Bedroom">
            <Light light="dimmableNoWarmth" />
            <Bundle bundle="sleep" />
            <Climate unit="cooling" />
            <Sensor sensor="bedroom" name="Air" />
          </Section>
          <Section title="Nursery and office">
            <Bundle bundle="nightLight" />
            <Bundle bundle="upstairs" />
            <Owlet seed="deep" />
            <Sensor sensor="office" footprint="compact" />
          </Section>
          <Section title="Outside">
            <Light light="onOff" />
            <Cover cover="garage" footprint="compact" />
            <Alarm alarm="ring" readOnly footprint="compact" />
            <Weather weather="partly" />
            <Sensor sensor="garage" footprint="compact" />
          </Section>
        </Columns>
      </DashboardPage>
    </Device>
  ),
};

/** One ungrouped grid keeps the same priority order while freely mixing every footprint and bundle form. */
export const PhoneUngrouped: Story = {
  name: "Phone, ungrouped footprints",
  render: () => (
    <Device label="Phone" width={390} height={844}>
      <DashboardPage title="Mixed dashboard" subtitle="No sections or groups" now={NOW}>
        <WidgetGrid columns={2}>
          <Cell span={2}><Light light="dimmable" footprint="featured" /></Cell>
          <Bundle bundle="sleep" />
          <Bundle bundle="nightLight" />
          <Climate unit="heating" footprint="compact" />
          <Cover cover="garage" footprint="compact" />
          <Sensor sensor="living" name="Air" />
          <Weather weather="partly" />
        </WidgetGrid>
      </DashboardPage>
    </Device>
  ),
};
