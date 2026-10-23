import type { ReactElement } from "react";
import { DashboardPage, Section, Columns, WidgetGrid, Cell } from "../../dashboards/layout";
import { JoinedBundle, LeadBundle } from "../../bundles/Bundle";
import { HaLightTile } from "../HaLightTile";
import { HaClimateTile } from "../HaClimateTile";
import { HaSensorTile } from "../HaSensorTile";
import { HaWeatherTile } from "../HaWeatherTile";
import { HaCoverTile } from "../HaCoverTile";
import { HaToggleTile } from "../HaToggleTile";
import { HaAlarmTile } from "../HaAlarmTile";
import type { BlockConfig, CardConfig, DashboardConfig, ItemConfig, SectionConfig } from "./config";

/** One configured card as its connected tile. */
function tile(card: CardConfig, key?: string): ReactElement {
  const common = { entityId: card.entity, name: card.name, footprint: card.footprint, showControl: card.showControl, loadHistory: card.history };
  switch (card.kind) {
    case "light": return <HaLightTile key={key} {...common} area={card.area} color={card.color} />;
    case "climate": return <HaClimateTile key={key} {...common} area={card.area} unit={card.unit} color={card.color} />;
    case "cover": return <HaCoverTile key={key} {...common} area={card.area} color={card.color} />;
    case "sensor": return <HaSensorTile key={key} {...common} area={card.area} humidityEntityId={card.humidity} batteryEntityId={card.battery} outdoor={card.outdoor} unit={card.unit} color={card.color} />;
    case "weather": return <HaWeatherTile key={key} {...common} aqiEntityId={card.aqi} aqiScale={card.aqiScale} sunEntityId={card.sun} loadForecasts={card.forecasts} />;
    case "toggle": return <HaToggleTile key={key} {...common} area={card.area} domain={card.domain} icon={card.icon} color={card.color} description={card.description} />;
    case "alarm": return <HaAlarmTile key={key} {...common} area={card.area} readOnly={card.readOnly} exitDelay={card.exitDelay} entryDelay={card.entryDelay} openSensors={card.openSensors} />;
  }
}

function item(entry: ItemConfig, index: number) {
  const key = entry.span > 1 ? undefined : String(index);
  const content = entry.kind === "joined"
    ? <JoinedBundle key={key} label={entry.label}>{entry.members.map((m, i) => tile(m, `${i}:${m.entity}`))}</JoinedBundle>
    : entry.kind === "lead"
      ? <LeadBundle key={key} lead={tile(entry.lead)} label={entry.label} sheetTitle={entry.sheetTitle}>{entry.rows.map((r, i) => tile(r, `${i}:${r.entity}`))}</LeadBundle>
      : tile(entry, key);
  return entry.span > 1 ? <Cell key={index} span={entry.span}>{content}</Cell> : content;
}

function section(s: SectionConfig, key: number) {
  const items = s.items.map(item);
  return s.title
    ? <Section key={key} title={s.title} note={s.note} columns={s.columns} gap={s.gap}>{items}</Section>
    : <WidgetGrid key={key} columns={s.columns} gap={s.gap}>{items}</WidgetGrid>;
}

function block(b: BlockConfig, key: number) {
  return b.kind === "columns" ? <Columns key={key} columns={b.columns} gap={b.gap}>{b.sections.map(section)}</Columns> : section(b, key);
}

export interface ConfigDashboardProps {
  config: DashboardConfig & { blocks: BlockConfig[] };
  /** Fixed clock for screenshots; live otherwise. */
  now?: Date;
}

/** A whole dashboard page drawn from the card's YAML. It needs an `HaProvider` above it. */
export function ConfigDashboard({ config, now }: ConfigDashboardProps) {
  return (
    <DashboardPage title={config.title} subtitle={config.subtitle} showTime={config.showTime} hourCycle={config.hourCycle} now={now}>
      {config.blocks.map(block)}
    </DashboardPage>
  );
}
