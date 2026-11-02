import type { ReactNode } from "react";
import type { LightEntity, LightHistory } from "@dashhaus/core/entities/light/types";
import { LcarsAction, LcarsCardFrame } from "../../shared/ui";
import type { LcarsFootprint } from "../../shared/ui";
import { IconLight } from "./icons";
import "./LcarsLightCard.css";

export interface LcarsLightCardProps {
  entity: LightEntity;
  history?: LightHistory;
  footprint?: LcarsFootprint;
  defaultOpen?: boolean;
  onToggle?: () => void;
}

const SEGMENTS = 12;
const stateWords = (state: string) => state.replace(/[_-]+/g, " ");

/** The intensity bar graph: twelve segments, lit up to the light's brightness. */
function LightMeter({ entity: e }: { entity: LightEntity }) {
  const on = e.state === "on";
  const level = on ? e.brightness ?? 100 : 0;
  const lit = on ? Math.max(1, Math.round((level / 100) * SEGMENTS)) : 0;
  return (
    <div className="lcars-light-meter" role="img" aria-label={on ? `Intensity ${level}%` : "Intensity off"}>
      <span className="lcars-light-meter-label" aria-hidden="true">Intensity</span>
      <span className="lcars-light-meter-bar" aria-hidden="true">
        {Array.from({ length: SEGMENTS }, (_, index) => <i key={index} data-lit={index < lit ? "" : undefined} />)}
      </span>
    </div>
  );
}

/** One light, as an LCARS panel: its brightness as the big reading, an intensity bar graph, and a Toggle pill. */
export function LcarsLightCard({ entity: e, history, footprint = "standard", defaultOpen = false, onToggle }: LcarsLightCardProps) {
  const unavailable = e.state === "unavailable";
  const summary: ReactNode = e.state === "on" && e.brightness != null ? `${e.brightness}%` : stateWords(e.state);
  const actions = onToggle
    ? <LcarsAction label="Toggle" pressed={e.state === "on"} unavailable={unavailable} onPress={onToggle} />
    : undefined;
  return (
    <LcarsCardFrame card="light" name={e.name} area={e.area} state={e.state} summary={summary} icon={<IconLight />} footprint={footprint} actions={actions} extra={unavailable ? undefined : <LightMeter entity={e} />} defaultOpen={defaultOpen}>
      <dl className="lcars-facts">
        {e.brightness != null && <div><dt>Intensity</dt><dd>{e.brightness}%</dd></div>}
        {e.kelvin != null && <div><dt>Colour temp</dt><dd>{e.kelvin} K</dd></div>}
        {e.lastChanged && <div><dt>Last change</dt><dd>{e.lastChanged}</dd></div>}
        {e.lastSeen && <div><dt>Last contact</dt><dd>{e.lastSeen}</dd></div>}
        <div><dt>Designation</dt><dd>{e.entityId}</dd></div>
      </dl>
      {history && <p className="lcars-facts-note">Active {Math.round(history.onMinutes)} min today</p>}
    </LcarsCardFrame>
  );
}
