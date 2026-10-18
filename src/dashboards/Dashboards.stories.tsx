import type { Meta, StoryObj } from "@storybook/react";
import type { ReactNode } from "react";
import { DashboardPage, Section, Columns, Cell } from "./layout";
import { DemoLightTile as Light } from "../widgets/light/demo/DemoLightTile";
import { DemoClimateTile as Climate } from "../widgets/climate/demo/DemoClimateTile";
import { DemoSensorTile as Sensor } from "../widgets/sensor/demo/DemoSensorTile";
import { DemoHomeTile as Home } from "../widgets/home/demo/DemoHomeTile";
import { DemoToggleTile as Toggle } from "../widgets/toggle/demo/DemoToggleTile";
import { DemoCoverTile as Cover } from "../widgets/cover/demo/DemoCoverTile";
import { DemoAlarmTile as Alarm } from "../widgets/alarm/demo/DemoAlarmTile";
import { DemoBundle as Bundle } from "../bundles/demo/DemoBundle";

/** A device-sized frame so each dashboard is seen at its real width. The content scrolls inside. */
function Device({ label, width, height, children }: { label: string; width: number; height: number; children: ReactNode }) {
  return (
    <figure style={{ margin: "24px auto", width, maxWidth: "100%", display: "grid", gap: 8 }}>
      <figcaption style={{ font: "500 13px var(--font)", color: "var(--ink-3)", paddingInline: 8 }}>{label} · {width} × {height}</figcaption>
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
    docs: { description: { component: "Home weather, security, modes, bundles, lights, covers, climate and sensors composed per device. Example data; the time is fixed at 11:54." } },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Phone: room temperatures at a glance as small tiles, the main thermostat as a card, everything else as thin rows. */
export const Phone: Story = {
  render: () => (
    <Device label="Phone" width={390} height={844}>
      <DashboardPage title="Home" now={NOW}>
        <Section title="Outside">
          <Home weather="partly" />
        </Section>
        <Section title="Security">
          <Alarm alarm="ring" readOnly />
        </Section>
        <Section title="Modes" columns={2}>
          <Cell span={2}><Bundle bundle="sleep" /></Cell>
          <Toggle mode="guest" density="mini" />
          <Toggle mode="quiet" density="mini" />
        </Section>
        <Section title="Nursery">
          <Bundle bundle="nightLight" />
          <Bundle bundle="upstairs" />
        </Section>
        <Section title="Rooms" columns={2}>
          <Sensor sensor="living" />
          <Sensor sensor="bedroom" />
          <Sensor sensor="bathroom" />
          <Sensor sensor="basement" />
        </Section>
        <Section title="Climate">
          <Climate unit="heating" />
          <Climate unit="cooling" density="thin" />
          <Climate unit="range" density="thin" />
        </Section>
        <Section title="Covers">
          <Cover cover="curtains" />
          <Cover cover="shade" density="thin" />
          <Cover cover="garage" density="thin" />
        </Section>
        <Section title="Lights">
          <Light light="dimmable" density="thin" />
          <Light light="dimmableOff" density="thin" />
          <Light light="dimmableNoWarmth" density="thin" />
          <Light light="onOff" density="thin" />
          <Light light="unavailable" density="thin" />
        </Section>
      </DashboardPage>
    </Device>
  ),
};

/** Tablet, landscape: a row of room sensors, then climate and lights side by side with their history. */
export const Tablet: Story = {
  render: () => (
    <Device label="Tablet, landscape" width={1180} height={820}>
      <DashboardPage title="Home" now={NOW} showTime>
        <Columns columns={2}>
          <Section title="Outside">
            <Home weather="partly" />
            <Light light="onOff" density="thin" />
            <Sensor sensor="garage" density="thin" />
          </Section>
          <Section title="Rooms" columns={2}>
            <Sensor sensor="living" />
            <Sensor sensor="bedroom" />
            <Sensor sensor="bathroom" />
            <Sensor sensor="basement" />
          </Section>
        </Columns>
        <Section title="Modes" columns={4}>
          <Cell span={2}><Bundle bundle="sleep" /></Cell>
          <Toggle mode="quiet" density="mini" />
          <Toggle mode="guest" density="mini" />
        </Section>
        <Section title="Nursery" columns={2}>
          <Bundle bundle="nightLight" />
          <Bundle bundle="upstairs" />
        </Section>
        <Columns columns={2}>
          <Section title="Climate">
            <Climate unit="heating" />
            <Climate unit="cooling" density="thin" />
            <Climate unit="range" density="thin" />
            <Climate unit="off" density="thin" />
          </Section>
          <Section title="Security">
            <Alarm alarm="ring" readOnly />
          </Section>
          <Section title="Covers">
            <Cover cover="curtains" density="thin" />
            <Cover cover="blind" density="thin" />
            <Cover cover="garage" density="thin" />
          </Section>
          <Section title="Lights">
            <Light light="dimmable" />
            <Light light="dimmableOff" density="thin" />
            <Light light="dimmableNoWarmth" density="thin" />
            <Light light="onOff" density="thin" />
          </Section>
        </Columns>
      </DashboardPage>
    </Device>
  ),
};

/** Wall panel, landscape: one column per place, readable from across the room. */
export const WallPanel: Story = {
  name: "Wall panel",
  render: () => (
    <Device label="Wall panel" width={1280} height={800}>
      <DashboardPage title="Home" now={NOW} showTime>
        <Columns columns={4} gap={16}>
          <Section title="Living room">
            <Sensor sensor="living" name="Air" />
            <Climate unit="heating" />
            <Light light="dimmable" />
            <Cover cover="curtains" density="thin" />
            <Light light="dimmableOff" density="thin" />
            <Light light="unavailable" density="thin" />
          </Section>
          <Section title="Bedroom">
            <Sensor sensor="bedroom" name="Air" />
            <Climate unit="cooling" />
            <Light light="dimmableNoWarmth" />
            <Bundle bundle="sleep" />
          </Section>
          <Section title="Nursery and office">
            <Bundle bundle="nightLight" />
            <Bundle bundle="upstairs" />
            <Sensor sensor="office" density="thin" />
            <Climate unit="range" density="thin" />
          </Section>
          <Section title="Outside">
            <Alarm alarm="ring" readOnly density="thin" />
            <Home weather="partly" />
            <Light light="onOff" />
            <Cover cover="garage" density="thin" />
            <Sensor sensor="garage" density="thin" />
          </Section>
        </Columns>
      </DashboardPage>
    </Device>
  ),
};

/** A phone layout that uses every size: S tiles in pairs, an M card across, thin rows below. */
export const PhoneMixedSizes: Story = {
  name: "Phone, mixed sizes",
  render: () => (
    <Device label="Phone" width={390} height={844}>
      <DashboardPage title="Living room" subtitle="Comfortable · 21.4°" now={NOW}>
        <Section title="Now" columns={2}>
          <Sensor sensor="living" name="Air" />
          <Light light="dimmable" />
          <Cell span={2}><Climate unit="heating" /></Cell>
          <Cell span={2}><Light light="dimmableOff" density="thin" /></Cell>
          <Cell span={2}><Light light="unavailable" density="thin" /></Cell>
        </Section>
      </DashboardPage>
    </Device>
  ),
};
