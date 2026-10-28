import type { Meta, StoryObj } from "@storybook/react";
import { useRef } from "react";
import type { ReactNode } from "react";
import { DashboardPage, Section, Columns, CardGrid, Cell } from "./layout";
import { NavBar } from "./NavBar";
import { useScrollSpy } from "../../../hooks/useScrollSpy";
import { DemoLightTile as Light } from "../cards/light/demo/DemoLightTile";
import { DemoClimateTile as Climate } from "../cards/climate/demo/DemoClimateTile";
import { DemoSensorTile as Sensor } from "../cards/sensor/demo/DemoSensorTile";
import { DemoWeatherTile as Weather } from "../cards/weather/demo/DemoWeatherTile";
import { DemoToggleTile as Toggle } from "../cards/toggle/demo/DemoToggleTile";
import { DemoCoverTile as Cover } from "../cards/cover/demo/DemoCoverTile";
import { DemoAlarmTile as Alarm } from "../cards/alarm/demo/DemoAlarmTile";
import { DemoOwletTile as Owlet } from "../cards/owlet/demo/DemoOwletTile";
import { DemoHumidifierTile as Humidifier } from "../cards/humidifier/demo/DemoHumidifierTile";
import { DemoSoundTile as Sound } from "../cards/sound/demo/DemoSoundTile";
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
  title: "Orb/Dashboards/Examples",
  parameters: {
    layout: "fullscreen",
    docs: { description: { component: "Examples of composing a dashboard per device: weather, security, modes, bundles, lights, covers, climate, sensors and the baby's sock. Not a template, and not every card. Example data; the time is fixed at 11:54." } },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const PHONE_SECTIONS = [["quick", "Quick actions"], ["status", "Home status"], ["nursery", "Nursery"], ["rooms", "Rooms"]] as const;

/** Phone: four frequent actions first (a bundle counts each member), then whole-home and nursery status,
    then room readings. Compact controls and bundles keep the shared 60px rhythm. The nav docked at the bottom
    jumps to each section and marks the one being read. */
function PhoneDashboard() {
  const page = useRef<HTMLDivElement>(null);
  const [reading, jump] = useScrollSpy(page);
  const nav = <NavBar items={PHONE_SECTIONS.map(([id, label]) => ({ key: id, label, kind: "section", current: reading === id, onSelect: () => jump(id) }))} />;
  return (
    <Device label="Phone" width={390} height={844}>
      <DashboardPage title="Home" now={NOW} pageRef={page} nav={nav}>
        <Section id="quick" title="Quick actions" columns={2}>
          <Cell span={2}><Bundle bundle="nursery" /></Cell>
          <Cell span={2}><Light light="dimmable" footprint="compact" /></Cell>
        </Section>
        <Section id="status" title="Home status">
          <Alarm alarm="ring" readOnly footprint="compact" />
          <Climate unit="heating" footprint="compact" />
          <Cover cover="garage" footprint="compact" />
          <Toggle mode="quiet" footprint="compact" />
          <Toggle mode="guest" footprint="compact" />
        </Section>
        <Section id="nursery" title="Nursery">
          <Owlet seed="deep" />
          <Climate unit="nurseryDyson" footprint="compact" />
          <Bundle bundle="sleep" />
        </Section>
        <Section id="rooms" title="Rooms" columns={2}>
          <Cell span={2}><Humidifier seed="on" footprint="compact" /></Cell>
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

/** Tablet, landscape: the same four actions as the phone, one of them the hero, lead; household status and
    nursery state follow, then the outside and room glance. */
export const Tablet: Story = {
  render: () => (
    <Device label="Tablet, landscape" width={1180} height={820}>
      <DashboardPage title="Home" now={NOW} showTime>
        <Section title="Quick actions" columns={2}>
          <Light light="dimmable" footprint="featured" />
          <Bundle bundle="nursery" />
        </Section>
        <Columns columns={2}>
          <Section title="Home status">
            <Alarm alarm="ring" readOnly footprint="compact" />
            <Climate unit="heating" />
            <Climate unit="cooling" footprint="compact" />
            <Climate unit="range" footprint="compact" />
            <Climate unit="off" footprint="compact" />
            <Toggle mode="quiet" footprint="compact" />
            <Toggle mode="guest" footprint="compact" />
          </Section>
          <Section title="Nursery" columns={2}>
            <Cell span={2}><Owlet seed="deep" /></Cell>
            <Cell span={2}><Bundle bundle="sleep" /></Cell>
            <Cell span={2}><Bundle bundle="upstairs" /></Cell>
          </Section>
        </Columns>
        <Columns columns={2}>
          <Section title="Outside">
            <Weather weather="partly" />
            <Light light="onOff" footprint="compact" />
            <Sensor sensor="garage" footprint="compact" />
            <Cover cover="garage" footprint="compact" />
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
      <DashboardPage title="Home" now={NOW} showTime viewing="far" style={{ paddingBottom: 0 }}>
        <Columns columns={4} gap={16}>
          <Section title="Living room">
            <Light light="dimmable" footprint="featured" />
            <Cover cover="curtains" footprint="compact" />
            <Light light="dimmableOff" footprint="compact" />
            <Climate unit="heating" footprint="compact" />
            <Sensor sensor="living" name="Air" />
          </Section>
          <Section title="Bedroom and office">
            <Light light="dimmableNoWarmth" />
            <Bundle bundle="sleep" />
            <Climate unit="cooling" />
            <Sensor sensor="bedroom" name="Air" />
            <Sensor sensor="office" footprint="compact" />
          </Section>
          <Section title="Nursery">
            <Bundle bundle="nursery" />
            <Bundle bundle="upstairs" />
            <Owlet seed="deep" />
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
        <CardGrid columns={2}>
          <Cell span={2}><Light light="dimmable" footprint="featured" /></Cell>
          <Bundle bundle="sleep" />
          <Bundle bundle="nursery" />
          <Climate unit="heating" footprint="compact" />
          <Sound seed="noVolume" footprint="compact" />
          <Cover cover="garage" footprint="compact" />
          <Sensor sensor="living" name="Air" />
          <Weather weather="partly" />
        </CardGrid>
      </DashboardPage>
    </Device>
  ),
};
