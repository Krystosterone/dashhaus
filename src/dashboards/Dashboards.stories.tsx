import type { Meta, StoryObj } from "@storybook/react";
import type { ReactNode } from "react";
import { DashboardPage, Section, Columns, WidgetGrid, Cell } from "./layout";
import { DemoLightTile as Light } from "../widgets/light/demo/DemoLightTile";
import { DemoClimateTile as Climate } from "../widgets/climate/demo/DemoClimateTile";
import { DemoSensorTile as Sensor } from "../widgets/sensor/demo/DemoSensorTile";
import { DemoWeatherTile as Weather } from "../widgets/weather/demo/DemoWeatherTile";
import { DemoToggleTile as Toggle } from "../widgets/toggle/demo/DemoToggleTile";
import { DemoCoverTile as Cover } from "../widgets/cover/demo/DemoCoverTile";
import { CoverTile } from "../widgets/cover/CoverTile";
import { COVER_SEEDS, useDemoCover } from "../widgets/cover/demo/useDemoCover";
import { DemoAlarmTile as Alarm } from "../widgets/alarm/demo/DemoAlarmTile";
import { DemoOwletTile as Owlet } from "../widgets/owlet/demo/DemoOwletTile";
import { DemoHumidifierTile as Humidifier } from "../widgets/humidifier/demo/DemoHumidifierTile";
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
    docs: { description: { component: "Weather, security, modes, bundles, lights, covers, climate, sensors and the baby's sock composed per device. Example data; the time is fixed at 11:54." } },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;
type AlertExperimentStory = StoryObj<{ activeAlert: boolean }>;

/** The alert experiment derives section visibility from the same cover state that renders the row. */
function GarageAlertSection({ enabled }: { enabled: boolean }) {
  const demo = useDemoCover(COVER_SEEDS.garage);
  return (
    <Section title="Alerts" when={enabled && demo.entity.state === "open"}>
      <CoverTile {...demo} footprint="compact" />
    </Section>
  );
}

/** Phone: arbitrary semantic sections composed from the same footprint matrix. Standard cards adapt
    their anatomy to cell width; compact cards and bundles stay on the shared 60px rhythm. */
function PhoneDashboard({ alertExperiment = false, activeAlert = false }: { alertExperiment?: boolean; activeAlert?: boolean }) {
  return (
    <Device label="Phone" width={390} height={844}>
      <DashboardPage title="Home" now={NOW}>
        {alertExperiment && <GarageAlertSection key={activeAlert ? "active" : "clear"} enabled={activeAlert} />}
        <Section title="Security">
          <Alarm alarm="ring" readOnly footprint="compact" />
        </Section>
        <Section title="Comfort">
          <Climate unit="heating" />
        </Section>
        <Section title="Rooms" columns={2}>
          <Sensor sensor="living" />
          <Sensor sensor="bedroom" />
          <Sensor sensor="bathroom" />
          <Sensor sensor="basement" />
        </Section>
        <Section title="Modes" columns={2}>
          <Cell span={2}><Bundle bundle="sleep" /></Cell>
          <Toggle mode="quiet" footprint="compact" />
          <Toggle mode="guest" footprint="compact" />
        </Section>
        <Section title="Nursery">
          <Owlet seed="deep" />
          <Bundle bundle="nightLight" />
          <Climate unit="nurseryDyson" footprint="compact" />
        </Section>
        <Section title="Controls">
          <Climate unit="cooling" footprint="compact" />
          <Climate unit="range" footprint="compact" />
          <Cover cover="curtains" footprint="compact" />
          {!alertExperiment && <Cover cover="garage" footprint="compact" />}
          <Light light="dimmable" footprint="compact" />
          <Light light="dimmableOff" footprint="compact" />
          <Light light="onOff" footprint="compact" />
          <Light light="unavailable" footprint="compact" />
          <Humidifier seed="on" footprint="compact" />
        </Section>
      </DashboardPage>
    </Device>
  );
}

export const Phone: Story = { render: () => <PhoneDashboard /> };

export const PhoneAlertExperiment: AlertExperimentStory = {
  name: "Phone, conditional garage alert",
  args: { activeAlert: true },
  argTypes: {
    activeAlert: { control: "boolean", name: "Active alert", description: "Show or omit the conditional Alerts section." },
  },
  render: ({ activeAlert }) => <PhoneDashboard alertExperiment activeAlert={activeAlert} />,
};

/** Tablet, landscape: weather and room sensors at the top, then climate and security with covers and
    lights, and the modes and bundles last. */
export const Tablet: Story = {
  render: () => (
    <Device label="Tablet, landscape" width={1180} height={820}>
      <DashboardPage title="Home" now={NOW} showTime>
        <Columns columns={2}>
          <Section title="Outside">
            <Weather weather="partly" footprint="featured" />
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
        <Columns columns={2}>
          <Section title="Climate">
            <Climate unit="heating" footprint="featured" />
            <Climate unit="cooling" footprint="compact" />
            <Climate unit="range" footprint="compact" />
            <Climate unit="off" footprint="compact" />
          </Section>
          <Section title="Lights">
            <Light light="dimmable" footprint="featured" />
            <Light light="dimmableOff" footprint="compact" />
            <Light light="dimmableNoWarmth" footprint="compact" />
            <Light light="onOff" footprint="compact" />
          </Section>
          <Section title="Security">
            <Alarm alarm="ring" readOnly footprint="featured" />
          </Section>
          <Section title="Covers">
            <Cover cover="curtains" footprint="compact" />
            <Cover cover="blind" footprint="compact" />
            <Cover cover="garage" footprint="compact" />
          </Section>
        </Columns>
        <Section title="Modes" columns={4}>
          <Cell span={2}><Bundle bundle="sleep" /></Cell>
          <Toggle mode="quiet" footprint="compact" />
          <Toggle mode="guest" footprint="compact" />
        </Section>
        <Section title="Nursery" columns={2}>
          <Owlet seed="deep" />
          <Bundle bundle="nightLight" />
          <Bundle bundle="upstairs" />
        </Section>
      </DashboardPage>
    </Device>
  ),
};

/** Wall panel, landscape: one column per place, readable from across the room. */
export const WallPanel: Story = {
  name: "Wall panel",
  render: () => (
    <Device label="Wall panel" width={1280} height={800}>
      <DashboardPage title="Home" now={NOW} showTime style={{ paddingBottom: 0 }}>
        <Columns columns={4} gap={16}>
          <Section title="Living room">
            <Sensor sensor="living" name="Air" />
            <Climate unit="heating" />
            <Light light="dimmable" />
            <Cover cover="curtains" footprint="compact" />
            <Light light="dimmableOff" footprint="compact" />
            <Light light="unavailable" footprint="compact" />
          </Section>
          <Section title="Bedroom">
            <Sensor sensor="bedroom" name="Air" />
            <Climate unit="cooling" />
            <Light light="dimmableNoWarmth" />
            <Bundle bundle="sleep" />
          </Section>
          <Section title="Nursery and office">
            <Owlet seed="deep" />
            <Bundle bundle="nightLight" />
            <Bundle bundle="upstairs" />
            <Sensor sensor="office" footprint="compact" />
            <Climate unit="range" footprint="compact" />
          </Section>
          <Section title="Outside">
            <Alarm alarm="ring" readOnly footprint="compact" />
            <Weather weather="partly" />
            <Light light="onOff" />
            <Cover cover="garage" footprint="compact" />
            <Sensor sensor="garage" footprint="compact" />
          </Section>
        </Columns>
      </DashboardPage>
    </Device>
  ),
};

/** One ungrouped grid freely mixes domains, bundles and every footprint without semantic sections. */
export const PhoneUngrouped: Story = {
  name: "Phone, ungrouped footprints",
  render: () => (
    <Device label="Phone" width={390} height={844}>
      <DashboardPage title="Mixed dashboard" subtitle="No sections or groups" now={NOW}>
        <WidgetGrid columns={2}>
          <Cell span={2}><Weather weather="partly" footprint="featured" /></Cell>
          <Sensor sensor="living" name="Air" />
          <Light light="dimmable" />
          <Climate unit="heating" footprint="compact" />
          <Cover cover="garage" footprint="compact" />
          <Cell span={2}><Bundle bundle="sleep" /></Cell>
          <Cell span={2}><Bundle bundle="nightLight" /></Cell>
        </WidgetGrid>
      </DashboardPage>
    </Device>
  ),
};
