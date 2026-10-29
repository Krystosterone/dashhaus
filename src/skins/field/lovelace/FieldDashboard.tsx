import { useState } from "react";
import type { ReactNode } from "react";
import { useHaSelector, useHaStore } from "../../../ha/provider";
import { actionMessage } from "../../../ha/lovelace/actionMessage";
import { HaClimateModule } from "../ha/HaClimateModule";
import { HaLightModule } from "../ha/HaLightModule";
import { HaSensorModule } from "../ha/HaSensorModule";
import { HaToggleModule } from "../ha/HaToggleModule";
import { HaWeatherModule } from "../ha/HaWeatherModule";
import { HaHumidifierModule } from "../ha/HaHumidifierModule";
import { HaSoundModule } from "../ha/HaSoundModule";
import { HaCoverModule } from "../ha/HaCoverModule";
import { HaAlarmModule } from "../ha/HaAlarmModule";
import { HaOwletModule } from "../ha/HaOwletModule";
import { Key } from "../shared/ui";
import { Area, FieldPage } from "../dashboards/layout";
import type { FieldFootprint } from "../shared/ui";
import { groupByArea } from "./auto";
import type { FieldKind, ModuleConfig } from "./config";
import "./dashboard.css";

interface LiveProps { item: ModuleConfig; footprint: FieldFootprint }

/** Each card's connected module, given a module's config and its footprint. A new card adds its row here. */
const LIVE: Record<FieldKind, (props: LiveProps) => ReactNode> = {
  light: ({ item, footprint }) => <HaLightModule entityId={item.entity} name={item.name} area={item.area} footprint={footprint} />,
  climate: ({ item, footprint }) => <HaClimateModule entityId={item.entity} name={item.name} area={item.area} footprint={footprint} />,
  sensor: ({ item, footprint }) => (
    <HaSensorModule entityId={item.entity} name={item.name} area={item.area} footprint={footprint} humidityEntityId={item.humidity} batteryEntityId={item.battery} outdoor={item.outdoor} />
  ),
  weather: ({ item, footprint }) => (
    <HaWeatherModule entityId={item.entity} name={item.name} footprint={footprint} aqiEntityId={item.aqi} aqiScale={item.aqiScale} sunEntityId={item.sun} loadForecasts={item.forecasts} />
  ),
  toggle: ({ item, footprint }) => (
    <HaToggleModule entityId={item.entity} name={item.name} area={item.area} footprint={footprint} icon={item.icon} description={item.description} />
  ),
  humidifier: ({ item, footprint }) => <HaHumidifierModule entityId={item.entity} name={item.name} area={item.area} footprint={footprint} />,
  sound: ({ item, footprint }) => <HaSoundModule entityId={item.entity} volumeEntityId={item.volume} name={item.name} area={item.area} footprint={footprint} />,
  cover: ({ item, footprint }) => <HaCoverModule entityId={item.entity} name={item.name} area={item.area} footprint={footprint} />,
  alarm: ({ item, footprint }) => (
    <HaAlarmModule entityId={item.entity} name={item.name} area={item.area} footprint={footprint} readOnly={item.readOnly} exitDelay={item.exitDelay} entryDelay={item.entryDelay} openSensors={item.openSensors} />
  ),
  owlet: ({ item, footprint }) => (
    <HaOwletModule entityId={item.entity} name={item.name} area={item.area} footprint={footprint} heartRateEntityId={item.heartRate} oxygenEntityId={item.oxygen} chargingEntityId={item.charging} baseEntityId={item.baseStation} alertEntityIds={item.alerts} staleAfterMinutes={item.staleAfter} />
  ),
};

/** One live module, routed by its card to the skin-free hook and the matching Field drawing. */
function LiveModule({ item, footprint }: LiveProps) {
  return LIVE[item.kind]({ item, footprint: item.footprint ?? footprint });
}

/** The latest command Home Assistant rejected, with Retry when repeating it is safe, and Dismiss. */
function ActionNotice() {
  const store = useHaStore();
  const error = useHaSelector((snapshot) => snapshot.lastActionError);
  const entity = useHaSelector((snapshot) => (error?.entityId ? snapshot.entities[error.entityId] : undefined));
  const [retrying, setRetrying] = useState(false);
  const canRetry = store.canRetryLastAction?.() === true;
  const message = actionMessage(error, entity, canRetry);
  if (!message) return null;
  return (
    <div className="fd-notice" role="alert" aria-label="Home Assistant action failed">
      <p className="fd-notice-t"><strong>{message.title}</strong><span>{message.detail}</span></p>
      <div className="fd-notice-keys">
        {canRetry && (
          <Key label={retrying ? "Retrying" : "Retry"} caption={retrying ? "Retrying" : "Retry"} disabled={retrying} onPress={() => {
            setRetrying(true);
            void store.retryLastAction?.().catch(() => undefined).finally(() => setRetrying(false));
          }}>{null}</Key>
        )}
        <Key label="Dismiss" caption="Dismiss" onPress={() => store.clearActionError?.()}>{null}</Key>
      </div>
    </div>
  );
}

export interface FieldDashboardProps {
  title?: string;
  /** A clock in the header (YAML `show_time`), on 12 or 24 hours (`hour_cycle`). */
  showTime?: boolean;
  hourCycle?: "h12" | "h23";
  /** The modules, each with its area from the YAML or, failing that, Home Assistant's registries. */
  items: ModuleConfig[];
  footprint: FieldFootprint;
  /** An alarm holds its inverted screen from the start, with no flash (YAML `quiet: true`). */
  quiet?: boolean;
}

/**
 * The field page drawn from the card's config (`FieldPage`): an optional header, the alert line with every alarm and
 * urgent warning its modules report, then an `Area` per area, its legend printed where there is more than one. A
 * rejected command docks at the bottom. It needs an `HaProvider` above it.
 */
export function FieldDashboard({ title, showTime, hourCycle, items, footprint, quiet }: FieldDashboardProps) {
  const groups = groupByArea(items);
  return (
    <FieldPage title={title} showTime={showTime} hourCycle={hourCycle} quiet={quiet}>
      {groups.map((g) => (
        <Area key={g.area ?? ""} title={g.area} legend={groups.length > 1} footprint={footprint}>
          {g.modules.map((item) => <LiveModule key={item.entity} item={item} footprint={footprint} />)}
        </Area>
      ))}
      {items.length === 0 && <p className="fd-dash-empty">No supported entities yet. Add <code>modules</code> to the card, or add a light, climate entity, temperature sensor or toggle to Home Assistant.</p>}
      <ActionNotice />
    </FieldPage>
  );
}
