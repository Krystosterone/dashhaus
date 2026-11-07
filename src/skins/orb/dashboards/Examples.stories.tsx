import type { Meta, StoryObj } from "@storybook/react";
import { useRef } from "react";
import type { ReactNode } from "react";
import { DashboardPage, Section, Columns, CardGrid, Cell } from "./layout";
import { NavBar } from "./NavBar";
import { useScrollSpy } from "@dashhaus/core/hooks";
import { DemoLightTile as Light } from "../cards/light/demo/DemoLightTile";
import { DemoClimateTile as Climate } from "../cards/climate/demo/DemoClimateTile";
import { DemoSensorTile as Sensor } from "../cards/sensor/demo/DemoSensorTile";
import { DemoWeatherTile as Weather } from "../cards/weather/demo/DemoWeatherTile";
import { DemoCoverTile as Cover } from "../cards/cover/demo/DemoCoverTile";
import { DemoAlarmTile as Alarm } from "../cards/alarm/demo/DemoAlarmTile";
import { DemoOwletTile as Owlet } from "../cards/owlet/demo/DemoOwletTile";
import { DemoLockTile as Lock } from "../cards/lock/demo/DemoLockTile";
import { DemoFanTile as Fan } from "../cards/fan/demo/DemoFanTile";
import { DemoHumidifierTile as Humidifier } from "../cards/humidifier/demo/DemoHumidifierTile";
import { DemoBundle as Bundle } from "../bundles/demo/DemoBundle";

/*
 * Examples of composing a dashboard, one per device. They show the composition rules (spec/orb.md → Dashboards), not
 * every card: a card earns a place here by showing something about a page, and each one's own stories show the rest.
 */

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
    docs: { description: { component: "Examples of composing a dashboard per device. Not a template, and not every card: each shows a way to order a page for a glance. Example data; the time is fixed at 11:54." } },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const PHONE_SECTIONS = [["quick", "Quick actions"], ["status", "Home status"], ["outside", "Outside"], ["nursery", "Nursery"], ["rooms", "Rooms"]] as const;

/** Phone: the things pressed most first (the living room's light, the front door and its fan), then the house at a
    glance in compact rows, the weather, the nursery, then each room's air. Compact rows and bundles keep the shared
    60px rhythm; no card is featured, so nothing outranks the first screen's controls. The nav docked at the bottom
    jumps to each section and marks the one being read. */
function PhoneDashboard() {
  const page = useRef<HTMLDivElement>(null);
  const [reading, jump] = useScrollSpy(page);
  const nav = <NavBar items={PHONE_SECTIONS.map(([id, label]) => ({ key: id, label, kind: "section", current: reading === id, onSelect: () => jump(id) }))} />;
  return (
    <Device label="Phone" width={390} height={844}>
      <DashboardPage title="Home" now={NOW} pageRef={page} nav={nav}>
        <Section id="quick" title="Quick actions" columns={2}>
          <Cell span={2}><Light light="dimmable" /></Cell>
          <Lock seed="locked" />
          <Fan seed="ceiling" />
        </Section>
        <Section id="status" title="Home status">
          <Alarm alarm="ring" readOnly footprint="compact" />
          <Climate unit="heating" footprint="compact" />
          <Cover cover="garage" footprint="compact" />
        </Section>
        <Section id="outside" title="Outside">
          <Weather weather="partly" />
          <Light light="onOff" footprint="compact" />
        </Section>
        <Section id="nursery" title="Nursery">
          <Owlet seed="deep" />
          <Bundle bundle="nursery" />
          <Humidifier seed="on" name="Humidifier" area="Nursery" footprint="compact" />
        </Section>
        <Section id="rooms" title="Rooms" columns={2}>
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

const TABLET_SECTIONS = [["quick", "Quick actions"], ["status", "Home status"], ["nursery", "Nursery"]] as const;

/**
 * The tablet's page: the hero light beside the nursery's sound machine, then the house's status beside the nursery,
 * each section one screen of cards at the top of the page. It ends where the screen does; the nav docked at the bottom
 * names each section.
 */
function TabletDashboard() {
  const page = useRef<HTMLDivElement>(null);
  const [reading, jump] = useScrollSpy(page);
  const nav = <NavBar items={TABLET_SECTIONS.map(([id, label]) => ({ key: id, label, kind: "section", current: reading === id, onSelect: () => jump(id) }))} />;
  return (
    <Device label="Tablet, landscape" width={1180} height={820}>
      <DashboardPage title="Home" now={NOW} showTime pageRef={page} nav={nav} style={{ minHeight: "100%" }}>
        <Section id="quick" title="Quick actions" columns={2}>
          <Light light="dimmable" footprint="featured" />
          <Bundle bundle="nursery" />
        </Section>
        <Columns columns={2}>
          <Section id="status" title="Home status">
            <Lock seed="locked" footprint="compact" />
            <Alarm alarm="ring" readOnly footprint="compact" />
            <Fan seed="ceiling" footprint="compact" />
          </Section>
          <Section id="nursery" title="Nursery">
            <Owlet seed="deep" />
            <Bundle bundle="sleep" />
          </Section>
        </Columns>
      </DashboardPage>
    </Device>
  );
}

/** Tablet, landscape: the hero light beside the nursery's sound machine, the house's status beside the nursery, and the
    nav docked at the bottom; the whole 1180 × 820 surface fits without scrolling. */
export const Tablet: Story = { render: () => <TabletDashboard /> };

/** Wall panel, landscape: one column per place, ordered actions, status, then glance. */
export const WallPanel: Story = {
  name: "Wall panel",
  render: () => (
    <Device label="Wall panel" width={1280} height={800}>
      <DashboardPage title="Home" now={NOW} showTime viewing="far" style={{ paddingBottom: 0 }}>
        <Columns columns={4} gap={16}>
          <Section title="Living room">
            <Light light="dimmable" footprint="featured" />
            <Climate unit="heating" footprint="compact" />
            <Fan seed="ceiling" footprint="compact" />
            <Cover cover="curtains" footprint="compact" />
            <Sensor sensor="living" name="Air" />
          </Section>
          <Section title="Bedroom">
            <Light light="dimmableNoWarmth" />
            <Bundle bundle="sleep" />
            <Climate unit="cooling" footprint="compact" />
            <Fan seed="on" footprint="compact" />
            <Humidifier seed="on" name="Humidifier" area="Bedroom" footprint="compact" />
            <Sensor sensor="bedroom" name="Air" />
          </Section>
          <Section title="Nursery">
            <Bundle bundle="nursery" />
            <Owlet seed="deep" />
            <Climate unit="nurseryDyson" footprint="compact" />
            <Humidifier seed="on" name="Humidifier" area="Nursery" />
          </Section>
          <Section title="Outside">
            <Weather weather="rain" />
            <Sensor sensor="outdoor" name="Air" />
            <Lock seed="locked" footprint="compact" />
            <Alarm alarm="ring" readOnly footprint="compact" />
            <Cover cover="garage" footprint="compact" />
            <Cover cover="gate" footprint="compact" />
            <Light light="onOff" footprint="compact" />
          </Section>
        </Columns>
      </DashboardPage>
    </Device>
  ),
};

/** One ungrouped grid keeps the same priority order while mixing all three footprints and two bundle forms. */
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
          <Lock seed="locked" footprint="compact" />
          <Cover cover="garage" footprint="compact" />
          <Sensor sensor="living" name="Air" />
          <Weather weather="partly" />
        </CardGrid>
      </DashboardPage>
    </Device>
  ),
};
