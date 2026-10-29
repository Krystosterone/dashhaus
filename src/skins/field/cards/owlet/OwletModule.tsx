import { useId } from "react";
import type { ReactNode } from "react";
import type { OwletEntity, OwletHistory } from "../../../../domains/owlet/types";
import { ALERT_WORD, SLEEP_WORD, fmtOxygen, normalize, rankAlerts } from "../../../../domains/owlet/readings";
import { fmtDuration } from "../../../../domains/format";
import { Blank, Digits, Glyph, Key, Legend, ModuleFrame, Pictogram, Screen, Today, Warn, useDetails } from "../../shared/ui";
import type { FieldFootprint } from "../../shared/ui";
import { HEART, IconBase, IconSock } from "./icons";
import "./OwletModule.css";

export interface OwletModuleProps {
  entity: OwletEntity;
  footprint?: FieldFootprint;
  /** Today's sleep on the module's meter; heart rate and oxygen too in the panel. Omit and the hours stay dark. */
  history?: OwletHistory;
  /** Panel only: switch the base station on or off. Omit, or leave `baseOn` unset, to hide it. */
  onBaseToggle?: () => void;
  /** Open the detail panel on first render (stories). */
  defaultOpen?: boolean;
}

/** The most urgent with a count of the rest, so a clipped line never hides that more exist. */
const withCount = (words: string[]) => (words.length > 1 ? `${words[0]} +${words.length - 1}` : words[0]);

/**
 * An Owlet Smart Sock as a field module: a reading, so nothing on it is pressed but its name. Its sock lies flat
 * where a key would be, and today's sleep takes the fader's place. The screen leads with the heart rate beside a
 * heart that flashes once every 2.4 s while readings arrive, as a pulse oximeter's does, and goes out once they stop;
 * the meta lines say the sleep state and the oxygen. A vitals alert is the alarm
 * going off, about the reading, so it takes the screen's first line behind the marker. A problem with the sock or
 * the base, or readings that stopped, is the device's: it takes the area's line, as "Base station off" does in plain
 * words. The base station is switched in the panel only: a stray tap on a dashboard must never silence a baby monitor.
 */
export function OwletModule({ entity: e, footprint = "standard", history, onBaseToggle, defaultOpen = false }: OwletModuleProps) {
  const details = useDetails(defaultOpen);
  const compact = footprint === "compact";
  const sleep = e.state === "unavailable" ? undefined : e.state;
  const hr = e.heartRate, o2 = e.oxygen;
  // Charging or out of reach: nothing to show. A sleep state or a reading alone still shows.
  const offline = sleep == null && hr == null && o2 == null;
  const stale = !offline && e.live === false;
  const { vitals, problems } = rankAlerts(e.alerts);

  const sleepWord = sleep ? SLEEP_WORD[sleep] : "Sleep unknown";
  const oxygen = o2 != null ? `${fmtOxygen(o2)}% O₂` : undefined;
  // A day as well as a time ("Fri 18:30"): the narrow line keeps the time, the part that says how long ago.
  const time = e.lastUpdated?.trim().split(/\s+/).at(-1);
  const staleWords = compact ? (time ? `Stopped ${time}` : "Stopped") : `No reading${time ? ` since ${time}` : ""}`;
  const vitalWords = vitals.map((a) => ALERT_WORD[a]);
  // On the screen the oxygen line beside it carries the figure; spoken in full, and where even the most urgent with
  // its count clips, the count alone.
  const vital = vitals.length > 1 ? (
    <Warn>
      <span aria-hidden="true">
        <span className="fd-ow-warn-l">{withCount(vitalWords)}</span>
        <span className="fd-ow-warn-s">{`${vitals.length} alerts`}</span>
      </span>
      <span className="fd-sr">{vitalWords.join(", ")}</span>
    </Warn>
  ) : vitals.length === 1 && <Warn>{vitalWords[0]}</Warn>;
  // A row's screen holds only the heart rate, so its line takes an oxygen alert's figure; with more than one, the count
  // first, so a long line never hides it (as the alarm's open doors).
  const o2Word = vitals[0]?.endsWith("oxygen") && o2 != null ? `${vitalWords[0]} ${fmtOxygen(o2)}%` : vitalWords[0];
  const vitalLine = vitals.length > 1 ? `${vitals.length} alerts: ${[o2Word, ...vitalWords.slice(1)].join(", ")}` : o2Word;
  const problem = problems.length ? withCount(problems.map((a) => ALERT_WORD[a])) : undefined;
  // The plate's line: the device's problem, else readings that stopped. A row has no meta lines, so a vitals alert
  // leads there too.
  const warning = (compact ? vitalLine : undefined) ?? problem ?? (stale ? staleWords : undefined);
  const note = e.baseOn === false ? "Base station off" : undefined;

  // Lit while there is a heart rate that hasn't stopped; beating while readings are known to arrive, once every 2.4 s, a
  // sign of life rather than the measured rate. Where the host can't tell, it stays lit and still.
  const pict = (
    <span className="fd-ow-heart" data-beat={(e.live === true && hr != null) || undefined}>
      <Pictogram param="neutral" lit={hr != null && !stale}>{HEART}</Pictogram>
    </span>
  );
  const read: ReactNode = offline ? <Blank label={e.charging ? "Charging" : "Unavailable"} />
    : hr != null ? <><Digits value={hr} /><small>bpm</small></>
    : <Blank label="No heart rate yet" />;
  // The panel lists every alert under its screen, so its screen keeps the sleep state through an alarm.
  const reading: [ReactNode, ReactNode?] = offline ? [e.charging ? "Charging" : "Unavailable", e.lastSeen ? `Seen ${e.lastSeen}` : undefined]
    : [sleepWord, oxygen ?? (hr == null ? "No reading yet" : undefined)];
  const meta: [ReactNode, ReactNode?] = vital && !offline ? [vital, oxygen ?? sleepWord] : reading;
  const state = offline ? "unavailable" : stale ? "stale" : sleep ?? "unknown";

  const glyph = <Glyph unavailable={offline}><IconSock /></Glyph>;
  const asleep = history && (history.asleepMinutes > 0 ? `Asleep ${fmtDuration(history.asleepMinutes)}` : "Not asleep today");

  return (
    <ModuleFrame
      kind="fd-ow"
      name={e.name}
      area={e.area}
      footprint={footprint}
      state={state}
      warning={warning}
      note={note}
      line={offline ? (e.charging ? "Charging" : undefined) : sleepWord}
      details={details}
      pict={pict}
      read={read}
      meta={meta}
      lead={glyph}
      row={(
        <div className="fd-ow-row">
          {glyph}
          <Today summary={asleep} label="Sleep by hour today." tone="neutral" samples={history?.sleep} currentHour={history?.currentHour} />
        </div>
      )}
    >
      <OwletDetails e={e} state={state} offline={offline} stale={stale} pict={pict} read={read} meta={reading} history={history} asleep={asleep} onBaseToggle={onBaseToggle} />
    </ModuleFrame>
  );
}

interface DetailsProps {
  e: OwletEntity;
  state: string;
  offline: boolean;
  stale: boolean;
  pict: ReactNode;
  read: ReactNode;
  meta: [ReactNode, ReactNode?];
  history?: OwletHistory;
  asleep?: string;
  onBaseToggle?: () => void;
}

/**
 * The panel's content: the screen as the module's, every alert sounding and whether readings stopped, the base
 * station's key, today's sleep, heart rate and oxygen, then when it last updated.
 */
function OwletDetails({ e, state, offline, stale, pict, read, meta, history, asleep, onBaseToggle }: DetailsProps) {
  const uid = useId();
  const { vitals, problems } = rankAlerts(e.alerts);
  const said = [
    ...[...vitals, ...problems].map((a) => ALERT_WORD[a]),
    ...(stale ? [`No new reading${e.lastUpdated ? ` since ${e.lastUpdated}` : ""}`] : []),
  ];
  const hrSeries = history?.heartRate ? normalize(history.heartRate) : null;
  const o2Series = history?.oxygen ? normalize(history.oxygen) : null;
  const lowHigh = (s: { min: number | null; max: number | null }, unit: string) =>
    s.min == null || s.max == null ? "No readings yet" : `Low ${Math.round(s.min)}${unit} · High ${Math.round(s.max)}${unit}`;
  const base = e.baseOn != null && onBaseToggle;

  return (
    <div className="fd-ow-panel" data-state={state}>
      <Screen pict={pict} meta={meta}>{read}</Screen>
      {said.length > 0 && <ul className="fd-ow-say">{said.map((w) => <li key={w}><Warn>{w}</Warn></li>)}</ul>}

      {base && (
        <div className="fd-block">
          <Legend id={`${uid}-b`}>Base station</Legend>
          <div className="fd-ow-base">
            <Key label="Base station" pressed={e.baseOn} wide caption={e.baseOn ? "On" : "Off"} onPress={onBaseToggle}><IconBase /></Key>
            <p className="fd-ow-hint">{e.baseOn ? "Sounds the alarm on an alert." : "Sounds no alarm. The sock still reads."}</p>
          </div>
        </div>
      )}

      {history && (
        <>
          <Today legend="Sleep today" summary={asleep} label="Sleep by hour today." tone="neutral" samples={history.sleep} currentHour={history.currentHour} />
          {hrSeries && <Today legend="Heart rate today" summary={lowHigh(hrSeries, " bpm")} label="Heart rate by hour today." tone="neutral" samples={hrSeries.samples} currentHour={history.currentHour} />}
          {o2Series && <Today legend="Oxygen today" summary={lowHigh(o2Series, "%")} label="Oxygen by hour today." tone="neutral" samples={o2Series.samples} currentHour={history.currentHour} />}
        </>
      )}

      <p className="fd-info">
        <span>{offline ? `Last seen ${e.lastSeen ?? "unknown"}` : e.lastUpdated ? `${e.live ? "Live · updated" : "Updated"} ${e.lastUpdated}` : ""}</span>
        <span>{offline && e.charging ? "On its charger" : ""}</span>
      </p>
    </div>
  );
}
