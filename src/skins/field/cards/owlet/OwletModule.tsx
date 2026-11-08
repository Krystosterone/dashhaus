import { useId } from "react";
import type { ReactNode } from "react";
import type { OwletEntity, OwletHistory } from "@dashhaus/core/entities/owlet/types";
import { ALERT_SAID, ALERT_SHORT, ALERT_WORD, CHARGING, SLEEP_UNKNOWN, SLEEP_WORD, fmtOxygen, normalize, rankAlerts, staleSaid, staleText, staleWarning } from "@dashhaus/core/entities/owlet/readings";
import { URGENT_PROBLEMS, owletSeverity } from "@dashhaus/core/entities/owlet/severity";
import { NO_READING_YET, lastSeenFact, updatedFact } from "@dashhaus/core/entities/facts";
import { rangeSummary, todaySummary } from "@dashhaus/core/entities/today";
import { Blank, Digits, Glyph, Key, Legend, ModuleFrame, Pictogram, Today, Warn, WarnWords, useDetails, ModuleRow, Notices } from "../../shared/ui";
import type { FieldFootprint } from "../../shared/ui";
import { HEART, IconBase, IconSock, O2 } from "./icons";
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
/** A warning's first alert with the count of the rest after it, which gives way before the word does (`Critical O₂ +1`). */
const warnCount = (words: string[]) => <WarnWords word={words[0]} detail={words.length > 1 ? ` +${words.length - 1}` : undefined} />;

/**
 * An Owlet Smart Sock as a field module: a reading, so nothing on it is pressed but its name. Its sock lies flat
 * where a key would be, and today's sleep takes the fader's place. The screen leads with the heart rate beside a
 * heart that flashes once every 2.4 s while readings arrive, as a pulse oximeter's does, and goes out once they stop;
 * the meta lines say the sleep state and the oxygen. Its warnings take their severity (`owletSeverity`): a vitals
 * alert is an alarm, the screen inverted with the vital that set it off as its figure; a problem that stops the
 * monitoring, or readings that stopped, is urgent, an inverted block on the screen; a low battery is advisory, on the
 * plate's line. "Base station off" is a note, in plain words. The base station is switched in the panel only: a stray
 * tap on a dashboard must never silence a baby monitor.
 */
export function OwletModule({ entity: e, footprint = "standard", history, onBaseToggle, defaultOpen = false }: OwletModuleProps) {
  const details = useDetails(defaultOpen);
  const sleep = e.state === "unavailable" ? undefined : e.state;
  const hr = e.heartRate, o2 = e.oxygen;
  // Charging or out of reach: nothing to show. A sleep state or a reading alone still shows.
  const offline = sleep == null && hr == null && o2 == null;
  const stale = !offline && e.live === false;
  const { vitals, problems } = rankAlerts(e.alerts);
  const level = owletSeverity(e.alerts, stale);

  const sleepWord = sleep ? SLEEP_WORD[sleep] : SLEEP_UNKNOWN;
  const oxygen = o2 != null ? `${fmtOxygen(o2)}% O₂` : undefined;
  const seen = e.lastSeen ? lastSeenFact(e.lastSeen) : undefined;
  const glyph = <Glyph unavailable={offline}><IconSock /></Glyph>;
  // Offline, the meter keeps the sleep so far and its legend says why there is no more, as the screen does.
  const asleep = history && (offline ? (e.charging ? CHARGING : "Unavailable") : todaySummary("asleep", history.asleepMinutes));

  // Lit while there is a heart rate that hasn't stopped; beating while readings are known to arrive, once every 2.4 s, a
  // sign of life rather than the measured rate. Where the host can't tell, it stays lit and still.
  const heart = (
    <span className="fd-ow-heart" data-beat={(e.live === true && hr != null) || undefined}>
      <Pictogram param="neutral" lit={hr != null && !stale}>{HEART}</Pictogram>
    </span>
  );
  // On its charger is a known resting state, so the screen names it in the dim ink (`DOCK`), never blank segments; out
  // of reach it can't, so they are blank. Before a first reading the segments are blank and say so in core's words.
  const heartRead: ReactNode = offline ? (e.charging ? <><span aria-hidden="true">DOCK</span><span className="fd-sr">{CHARGING}</span></> : <Blank label="Unavailable" />)
    : hr != null ? <><Digits value={hr} /><small>bpm</small></>
    : <Blank label={NO_READING_YET} />;
  // The reading as it is, alarm or not: the panel's screen, under which every alert is listed.
  const reading: [ReactNode, ReactNode?] = offline ? [e.charging ? CHARGING : "Unavailable", seen]
    : [sleepWord, oxygen ?? (hr == null ? "No reading yet" : undefined)];

  let pict: ReactNode = heart, read = heartRead, meta = reading;
  let warning: ReactNode, rowWarning: ReactNode;
  let alert: { level: "urgent" | "alarm"; what: string; startedAt?: number; say?: string } | undefined;
  if (level === "alarm") {
    // The figure is the vital that set it off: the oxygen, or the heart rate. Its first line says how, in a word.
    const lead = vitals[0];
    const byOxygen = lead.endsWith("oxygen") && o2 != null;
    const fits = byOxygen || (lead.endsWith("heart_rate") && hr != null);
    if (byOxygen) {
      pict = <Pictogram param="neutral" lit>{O2}</Pictogram>;
      read = <><Digits value={o2} /><small>% O₂</small></>;
    }
    const others = vitals.slice(1).map((a) => ALERT_WORD[a]);
    // On the screen's first line beside its figure, a word (`Critical`); without the figure, the alert's own words.
    meta = [fits ? ALERT_SHORT[lead] : ALERT_WORD[lead], others.length ? withCount(others) : byOxygen ? (hr != null ? `${hr} bpm` : sleepWord) : oxygen ?? sleepWord];
    const figure = byOxygen ? `${fmtOxygen(o2)}%` : hr != null && lead.endsWith("heart_rate") ? `${hr} bpm` : "";
    rowWarning = warnCount(vitals.map((a) => ALERT_WORD[a]));
    const what = [ALERT_WORD[lead], figure].filter(Boolean).join(" ") + (vitals.length > 1 ? ` +${vitals.length - 1}` : "");
    const spoken = vitals.map((a) => ALERT_SAID[a].toLowerCase()).join(", ");
    alert = { level, what, startedAt: e.vitalsSince, say: `Alarm: ${e.name}, ${spoken}${byOxygen ? `, oxygen ${fmtOxygen(o2)} percent` : hr != null ? `, heart rate ${hr}` : ""}.` };
  } else if (level === "urgent") {
    // What stopped the monitoring, in an inverted block; a day as well as a time ("Fri 18:30") keeps the time. Readings
    // that stopped say their word and since when apart, so a narrow module or row lets the time go and keeps the word
    // whole (`Stopped`, never `Stoppe…`).
    const urgent = problems.find((p) => URGENT_PROBLEMS.has(p));
    const stopped = staleWarning(e.lastUpdated);
    const words: ReactNode = urgent ? ALERT_WORD[urgent]
      : <>{stopped.word}{stopped.detail && <span className="fd-ow-since"> {stopped.detail}</span>}</>;
    meta = [<Warn key="w" block>{words}</Warn>, offline ? seen : sleepWord];
    rowWarning = words;
    alert = { level, what: urgent ? ALERT_WORD[urgent] : staleText(e.lastUpdated) };
  } else if (problems.length) {
    // Advisory, the device's: the plate's line. A pressing level above takes its place, and the panel lists it.
    warning = warnCount(problems.map((a) => ALERT_WORD[a]));
  }
  const compact = footprint === "compact";

  // The panel's content: the screen as the module's, every alert sounding and whether readings stopped, the base
  // station's key, today's sleep, heart rate and oxygen, then when it last updated.
  const uid = useId();
  const said = [
    ...[...vitals, ...problems].map((a) => ALERT_SAID[a]),
    ...(stale ? [staleSaid(e.lastUpdated)] : []),
  ];
  const hrSeries = history?.heartRate ? normalize(history.heartRate) : null;
  const o2Series = history?.oxygen ? normalize(history.oxygen) : null;
  const lowHigh = (s: { min: number | null; max: number | null }, unit: string) => rangeSummary(s.min, s.max, (v) => `${Math.round(v)}${unit}`);
  const base = e.baseOn != null && onBaseToggle;

  return (
    <ModuleFrame
      kind="fd-ow"
      name={e.name}
      area={e.area}
      footprint={footprint}
      state={offline ? (e.charging ? "charging" : "unavailable") : stale ? "stale" : sleep ?? "unknown"}
      // Readings that stopped are old, so the figure dims as the heart beside it goes out; on its charger, a known
      // resting state, its figure (DOCK) is dim too, never blank segments.
      rest={offline ? e.charging : stale}
      warning={compact ? rowWarning ?? warning : warning}
      note={e.baseOn === false ? "Base station off" : undefined}
      line={offline ? (e.charging ? CHARGING : undefined) : sleepWord}
      alert={alert}
      details={details}
      pict={pict}
      read={read}
      meta={meta}
      lead={glyph}
      row={(
        <ModuleRow className="fd-ow-row">
          {glyph}
          <Today summary={asleep} label="Sleep by hour today." tone="neutral" samples={history?.sleep} currentHour={history?.currentHour} />
        </ModuleRow>
      )}
      panelScreen={{ pict: heart, read: heartRead, meta: reading }}
      facts={{ start: offline ? lastSeenFact(e.lastSeen) : updatedFact(e.lastUpdated, e.live), end: offline && e.charging ? CHARGING : "" }}
    >
      {said.length > 0 && <Notices className="fd-ow-say" warnings={said} />}

      {base && (
        <div className="fd-block">
          <Legend id={`${uid}-b`}>Base station</Legend>
          <div className="fd-ow-base">
            <Key label="Base station" pressed={e.baseOn} wide caption={e.baseOn ? "On" : "Off"} onPress={onBaseToggle}><IconBase /></Key>
            <p className="fd-hint">{e.baseOn ? "Sounds the alarm on an alert." : "Sounds no alarm. The sock still reads."}</p>
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
    </ModuleFrame>
  );
}

