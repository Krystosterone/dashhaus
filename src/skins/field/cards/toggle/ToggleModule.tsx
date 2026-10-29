import { useId } from "react";
import type { ReactNode } from "react";
import type { DurationOption, ToggleEntity, ToggleHistory } from "../../../../domains/toggle/types";
import { DEFAULT_DURATIONS } from "../../../../domains/toggle/durations";
import { fmtDuration } from "../../../../domains/format";
import { Blank, Key, Legend, ModuleFrame, Pictogram, Screen, Today, useDetails } from "../../shared/ui";
import type { FieldFootprint } from "../../shared/ui";
import { CLOCK, IconMode, modePict } from "./icons";
import "./ToggleModule.css";

export interface ToggleModuleProps {
  entity: ToggleEntity;
  footprint?: FieldFootprint;
  /** Today, for the detail panel. Omit to leave the panel without it. */
  history?: ToggleHistory;
  onToggle: () => void;
  /** Turn on (or keep on) with one of `durations`. Omit and the panel has no duration keys. */
  onTurnOnFor?: (value: string) => void;
  /** The panel's ways to turn it on. Default: 30 min, 1 hour, until morning, until off. */
  durations?: DurationOption[];
  /** Open the detail panel on first render (stories). */
  defaultOpen?: boolean;
}

/**
 * A mode you switch on and off (Do Not Disturb, Quiet, Guest) as a field module: one input_boolean or switch.
 * The key carries the mode's glyph and switches it; its LED says it's on, and the screen agrees with the mode's
 * pictogram lit and ON. The meta lines say until when, or since when. A mode sets no parameter, so nothing on it
 * wears a parameter's colour, and the entity's own colour isn't drawn. The name, or a press and hold on the key,
 * opens the detail panel: what the mode does, ways to turn it on for a while, and today.
 */
export function ToggleModule({ entity: e, footprint = "standard", history, onToggle, onTurnOnFor, durations = DEFAULT_DURATIONS, defaultOpen = false }: ToggleModuleProps) {
  const details = useDetails(defaultOpen);
  const unav = e.state === "unavailable";
  const on = e.state === "on";

  const pict = <Pictogram param="neutral" lit={on}>{modePict(e.icon)}</Pictogram>;
  const read: ReactNode = unav ? <Blank label="Unavailable" /> : on ? "ON" : "OFF";
  const since = e.lastChanged ? `Since ${e.lastChanged}` : undefined;
  const meta: [ReactNode, ReactNode?] | undefined = unav ? ["Unavailable", e.lastSeen ? `Seen ${e.lastSeen}` : undefined]
    : on && e.until ? [`Until ${e.until}`, since]
    : since ? [since]
    : undefined;
  // Square at the head of a compact row; across the row in a module and the panel, with its state word.
  const key = (wide: boolean) => (
    <Key label={e.name} pressed={on} unavailable={unav} onPress={onToggle} onHold={details.openDetails} wide={wide} caption={wide && !unav ? (on ? "On" : "Off") : undefined}>
      <IconMode icon={e.icon} />
    </Key>
  );

  return (
    <ModuleFrame kind="fd-tw" name={e.name} area={e.area} footprint={footprint} state={e.state} details={details} pict={pict} read={read} meta={meta} lead={key(false)} row={key(true)}>
      <ToggleDetails e={e} read={read} pict={pict} meta={meta} control={key(true)} history={history} durations={onTurnOnFor ? durations : []} onTurnOnFor={onTurnOnFor} />
    </ModuleFrame>
  );
}

interface DetailsProps {
  e: ToggleEntity;
  read: ReactNode;
  pict: ReactNode;
  meta?: [ReactNode, ReactNode?];
  control: ReactNode;
  history?: ToggleHistory;
  durations: DurationOption[];
  onTurnOnFor?: (value: string) => void;
}

/**
 * The panel's content: the screen, with when it switches itself off on its second channel; the key; what the
 * mode does; a key per way to turn it on, the one it was turned on with chosen; today; and facts.
 */
function ToggleDetails({ e, read, pict, meta, control, history, durations, onTurnOnFor }: DetailsProps) {
  const uid = useId();
  const unav = e.state === "unavailable";
  const on = e.state === "on";
  const chosen = on ? durations.find((d) => d.value === e.duration) : undefined;
  const today = history && (unav ? "Unavailable" : history.onMinutes > 0 ? `On ${fmtDuration(history.onMinutes)}` : "Not on today");

  const aside = on && e.until ? (
    <p className="fd-chan">
      <Pictogram lit param="neutral">{CLOCK}</Pictogram>
      <span>
        {e.until}
        <span className="fd-chan-sub">Turns off</span>
      </span>
    </p>
  ) : undefined;

  return (
    <div className="fd-tw-panel" data-state={e.state}>
      <Screen pict={pict} meta={meta} aside={aside}>{read}</Screen>
      {control}
      {e.description && <p className="fd-tw-desc">{e.description}</p>}

      {onTurnOnFor && durations.length > 0 && (
        <div className="fd-block">
          <Legend id={`${uid}-d`} value={chosen?.label}>{on ? "Keep on" : "Turn on for"}</Legend>
          <div className="fd-tw-durations" role="group" aria-labelledby={`${uid}-d`}>
            {durations.map((d) => (
              <div key={d.value} className="fd-tw-duration">
                <Key label={d.sub ? `${d.label}, ${d.sub}` : d.label} wide caption={d.label} chosen={d === chosen} disabled={unav} onPress={() => onTurnOnFor(d.value)}>{null}</Key>
                <span className="fd-tw-duration-sub" aria-hidden="true">{d.sub}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {history && <Today summary={today} label="On by hour today." tone="neutral" samples={history.samples} currentHour={history.currentHour} />}

      <p className="fd-info">
        <span>{unav ? `Last seen ${e.lastSeen ?? "unknown"}` : e.lastChanged ? `Last changed ${e.lastChanged}` : ""}</span>
        <span>{e.entityId.startsWith("switch.") ? "Switch" : "Toggle helper"}</span>
      </p>
    </div>
  );
}
