import { useId } from "react";
import type { ReactNode } from "react";
import type { OwletEntity, OwletHistory } from "@dashhaus/core/entities/owlet/types";
import { ALERT_SHORT, ALERT_WORD, SLEEP_WORD, URGENT_PROBLEMS, fmtOxygen, normalize, owletSeverity, rankAlerts } from "@dashhaus/core/entities/owlet/readings";
import { lastSeenFact, updatedFact } from "@dashhaus/core/entities/facts";
import { todaySummary } from "@dashhaus/core/entities/today";
import { Blank, Digits, Glyph, Key, Legend, ModuleFrame, Pictogram, Today, Warn, useDetails, ModuleRow, Notices } from "../../shared/ui";
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

  const sleepWord = sleep ? SLEEP_WORD[sleep] : "Sleep unknown";
  const oxygen = o2 != null ? `${fmtOxygen(o2)}% O₂` : undefined;
  const seen = e.lastSeen ? `Seen ${e.lastSeen}` : undefined;
  const glyph = <Glyph unavailable={offline}><IconSock /></Glyph>;
  // Offline, the meter keeps the sleep so far and its legend says why there is no more, as the screen does.
  const asleep = history && (offline ? (e.charging ? "Charging" : "Unavailable") : todaySummary("asleep", history.asleepMinutes));

  // Lit while there is a heart rate that hasn't stopped; beating while readings are known to arrive, once every 2.4 s, a
  // sign of life rather than the measured rate. Where the host can't tell, it stays lit and still.
  const heart = (
    <span className="fd-ow-heart" data-beat={(e.live === true && hr != null) || undefined}>
      <Pictogram param="neutral" lit={hr != null && !stale}>{HEART}</Pictogram>
    </span>
  );
  const heartRead: ReactNode = offline ? <Blank label={e.charging ? "Charging" : "Unavailable"} />
    : hr != null ? <><Digits value={hr} /><small>bpm</small></>
    : <Blank label="No heart rate yet" />;
  // The reading as it is, alarm or not: the panel's screen, under which every alert is listed.
  const reading: [ReactNode, ReactNode?] = offline ? [e.charging ? "Charging" : "Unavailable", seen]
    : [sleepWord, oxygen ?? (hr == null ? "No reading yet" : undefined)];

  let pict: ReactNode = heart, read = heartRead, meta = reading;
  let warning: string | undefined, rowWarning: string | undefined;
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
    meta = [fits ? ALERT_SHORT[lead] : ALERT_WORD[lead], others.length ? withCount(others) : byOxygen ? (hr != null ? `${hr} bpm` : sleepWord) : oxygen ?? sleepWord];
    const figure = byOxygen ? `${fmtOxygen(o2)}%` : hr != null && lead.endsWith("heart_rate") ? `${hr} bpm` : "";
    rowWarning = withCount(vitals.map((a) => ALERT_WORD[a]));
    const what = [ALERT_WORD[lead], figure].filter(Boolean).join(" ") + (vitals.length > 1 ? ` +${vitals.length - 1}` : "");
    const spoken = vitals.map((a) => ALERT_WORD[a].toLowerCase()).join(", ");
    alert = { level, what, startedAt: e.vitalsSince, say: `Alarm: ${e.name}, ${spoken}${byOxygen ? `, oxygen ${fmtOxygen(o2)} percent` : hr != null ? `, heart rate ${hr}` : ""}.` };
  } else if (level === "urgent") {
    // What stopped the monitoring, in an inverted block; a day as well as a time ("Fri 18:30") keeps the time.
    const time = e.lastUpdated?.trim().split(/\s+/).at(-1);
    const urgent = problems.find((p) => URGENT_PROBLEMS.has(p));
    const words = urgent ? ALERT_WORD[urgent] : time ? `Stopped ${time}` : "Stopped";
    meta = [<Warn key="w" block>{words}</Warn>, offline ? seen : sleepWord];
    rowWarning = words;
    alert = { level, what: urgent ? words : `No reading${time ? ` since ${time}` : ""}` };
  } else if (problems.length) {
    // Advisory, the device's: the plate's line. A pressing level above takes its place, and the panel lists it.
    warning = withCount(problems.map((a) => ALERT_WORD[a]));
  }
  const compact = footprint === "compact";

  // The panel's content: the screen as the module's, every alert sounding and whether readings stopped, the base
  // station's key, today's sleep, heart rate and oxygen, then when it last updated.
  const uid = useId();
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
    <ModuleFrame
      kind="fd-ow"
      name={e.name}
      area={e.area}
      footprint={footprint}
      state={offline ? "unavailable" : stale ? "stale" : sleep ?? "unknown"}
      warning={compact ? rowWarning ?? warning : warning}
      note={e.baseOn === false ? "Base station off" : undefined}
      line={offline ? (e.charging ? "Charging" : undefined) : sleepWord}
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
      facts={{ start: offline ? lastSeenFact(e.lastSeen) : updatedFact(e.lastUpdated, e.live), end: offline && e.charging ? "On its charger" : "" }}
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

