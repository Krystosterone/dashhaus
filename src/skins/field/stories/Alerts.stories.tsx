import type { Meta, StoryObj } from "@storybook/react";
import type { ReactNode } from "react";
import type { FieldFootprint } from "../shared/ui";
import { AlertLine, AlertsProvider } from "../shared/alerts";
import { OwletModule } from "../cards/owlet/OwletModule";
import { OWLET_SEEDS } from "../cards/owlet/demo/socks";
import type { OwletSeedName } from "../cards/owlet/demo/socks";
import { AlarmModule } from "../cards/alarm/AlarmModule";
import { ALARM_SEEDS, useDemoAlarm } from "../cards/alarm/demo/useDemoAlarm";
import type { AlarmSeed } from "../cards/alarm/demo/useDemoAlarm";
import { SensorModule } from "../cards/sensor/SensorModule";
import { SENSOR_SEEDS } from "../cards/sensor/demo/sensors";

const meta = {
  title: "Field/Foundations/Alerts",
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Field's severity ladder (spec/field.md → Design rules): how much of the always-dark screen inverts. Advisory keeps the marker " +
          "and its words; urgent turns them into an inverted block; an alarm inverts the whole screen, makes the figure the alarm, rules " +
          "the plate's edge, flashes once a second for ten seconds and then holds until it clears (steady from the start under reduced " +
          "motion, or the dashboard's `quiet`). The dashboard's alert line lists every alarm and urgent warning. Remount a story to see " +
          "the flash again; try both finishes.",
      },
    },
  },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

function DemoAlarm({ seed, footprint }: { seed: AlarmSeed; footprint?: FieldFootprint }) {
  const demo = useDemoAlarm(seed);
  return <AlarmModule entity={demo.entity} history={demo.history} footprint={footprint} onArm={demo.onArm} onDisarm={demo.onDisarm} />;
}

const sock = (name: OwletSeedName, footprint?: FieldFootprint) => (
  <OwletModule entity={{ ...OWLET_SEEDS[name].entity, baseOn: OWLET_SEEDS[name].entity.baseOn ?? true }} history={OWLET_SEEDS[name].history} footprint={footprint} />
);

const LEVELS: { level: string; rule: string; owlet: OwletSeedName; alarm?: AlarmSeed }[] = [
  { level: "Note · a choice", rule: "Plain words in place of the area", owlet: "baseOff" },
  { level: "Advisory · look when convenient", rule: "The marker and its words", owlet: "lowBattery", alarm: ALARM_SEEDS.openDoor },
  { level: "Urgent · act soon", rule: "An inverted block", owlet: "sockOff", alarm: ALARM_SEEDS.pending },
  { level: "Alarm · act now", rule: "The whole screen inverts", owlet: "critical", alarm: ALARM_SEEDS.triggered },
];

function Level({ level, rule, children }: { level: string; rule: string; children: ReactNode }) {
  return (
    <section style={{ display: "grid", gap: 8 }}>
      <div style={{ display: "grid", gap: 2 }}>
        <h2 style={{ margin: 0, font: "600 12px var(--fd-sans)", fontStretch: "var(--fd-wide)", letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--fd-ink)" }}>{level}</h2>
        <p style={{ margin: 0, font: "400 12px var(--fd-sans)", color: "var(--fd-ink-2)" }}>{rule}</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 300px), 1fr))", gap: 12, alignItems: "start" }}>{children}</div>
    </section>
  );
}

/** Each level on a sock and the house alarm, as 160 px modules. */
export const Ladder: Story = {
  render: () => (
    <div style={{ display: "grid", gap: 24 }}>
      {LEVELS.map((l) => (
        <Level key={l.level} level={l.level} rule={l.rule}>
          {sock(l.owlet)}
          {l.alarm && <DemoAlarm seed={l.alarm} />}
        </Level>
      ))}
    </div>
  ),
};

/** The same as 64 px rows: a row has no screen lines, so an urgent or alarm warning is the block on its line. */
export const Compact: Story = {
  render: () => (
    <div style={{ display: "grid", gap: 24 }}>
      {LEVELS.map((l) => (
        <Level key={l.level} level={l.level} rule={l.rule}>
          {sock(l.owlet, "compact")}
          {l.alarm && <DemoAlarm seed={l.alarm} footprint="compact" />}
        </Level>
      ))}
    </div>
  ),
};

/**
 * A screenful at a glance: two alarms and an urgent sock among calm modules, the alert line under the title. Alarms
 * first, then the newest; a tap opens the module's panel.
 */
export const OnADashboard: Story = {
  name: "On a dashboard",
  parameters: { layout: "fullscreen" },
  render: () => (
    <AlertsProvider>
      <div style={{ padding: 16, display: "grid", alignContent: "start", gap: 16, background: "var(--fd-page)", minHeight: "100vh", boxSizing: "border-box" }}>
        <AlertLine />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 260px), 1fr))", gap: 12, alignItems: "start" }}>
          <SensorModule entity={SENSOR_SEEDS.indoor.entity} history={SENSOR_SEEDS.indoor.history} />
          <DemoAlarm seed={ALARM_SEEDS.triggered} />
          <SensorModule entity={SENSOR_SEEDS.humid.entity} history={SENSOR_SEEDS.humid.history} />
          <OwletModule entity={{ ...OWLET_SEEDS.sockOff.entity, name: "Ben", area: "Kids' room" }} history={OWLET_SEEDS.sockOff.history} />
          <SensorModule entity={SENSOR_SEEDS.outdoor.entity} history={SENSOR_SEEDS.outdoor.history} />
          {sock("critical")}
          <SensorModule entity={SENSOR_SEEDS.lowBattery.entity} history={SENSOR_SEEDS.lowBattery.history} />
        </div>
      </div>
    </AlertsProvider>
  ),
};
