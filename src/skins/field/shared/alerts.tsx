import { createContext, useContext, useEffect, useId, useMemo, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import type { Severity } from "@scope/core/entities/severity";
import "./alerts.css";

/** The levels that reach the dashboard's alert line: what can't wait. */
export type Pressing = Exclude<Severity, "advisory">;

/** One module's pressing warning, on the dashboard's alert line. */
export interface AlertEntry {
  level: Pressing;
  /** The module's name: "Nova". */
  name: string;
  /** What is wrong, short: "Critical oxygen 79%". */
  what: string;
  /** When it started, in ms since the epoch, if the host knows: the line's order, and an alarm's flash keeps its phase. */
  startedAt?: number;
}

interface Reported extends AlertEntry {
  /** When it started, or else when this level was first reported here: the line's order. */
  since: number;
  open: () => void;
}

interface Registry {
  set: (id: string, entry: Reported | undefined) => void;
}

const AlertsContext = createContext<Registry | null>(null);
const EntriesContext = createContext<Record<string, Reported>>({});

/** Collects what the modules under it report, for an `AlertLine`. Without one, modules report to nobody. */
export function AlertsProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<Record<string, Reported>>({});
  const registry = useMemo<Registry>(() => ({
    set: (id, entry) => setEntries((all) => {
      if (entry) return { ...all, [id]: entry };
      if (!(id in all)) return all;
      const rest = { ...all };
      delete rest[id];
      return rest;
    }),
  }), []);
  return (
    <AlertsContext.Provider value={registry}>
      <EntriesContext.Provider value={entries}>{children}</EntriesContext.Provider>
    </AlertsContext.Provider>
  );
}

/**
 * Report this module's pressing warning to the dashboard's alert line while it lasts, with what opens its details. A
 * level keeps its start time while only its words change, so the line's order holds still.
 */
export function useReportAlert(entry: AlertEntry | undefined, open: () => void) {
  const registry = useContext(AlertsContext);
  const id = useId();
  const opener = useRef(open);
  opener.current = open;
  const since = useRef<{ level: Pressing; at: number } | undefined>(undefined);
  const { level, name, what, startedAt } = entry ?? {};
  useEffect(() => {
    if (!registry) return;
    if (!level || !name || !what) {
      since.current = undefined;
      registry.set(id, undefined);
      return;
    }
    if (since.current?.level !== level) since.current = { level, at: Date.now() };
    registry.set(id, { level, name, what, startedAt, since: startedAt ?? since.current.at, open: () => opener.current() });
  }, [registry, id, level, name, what, startedAt]);
  useEffect(() => () => registry?.set(id, undefined), [registry, id]);
}

/**
 * An alarm's flash, as a negative `animation-delay` (`--fd-alarm-delay`): fixed as the alarm begins, from when it
 * started, so a module mounted later (a view switched back to, a reconnect) picks the flash up where it would be, and
 * one more than ten seconds old lands with it done. Unknown start: the flash runs from now.
 */
export function useAlarmPhase(active: boolean, startedAt?: number): string | undefined {
  return useMemo(() => (active && startedAt != null ? `${-Math.max(0, (Date.now() - startedAt) / 1000).toFixed(2)}s` : undefined), [active, startedAt]);
}

/** One entry on the alert line, its alarm tag blinking in phase with its module. */
function Entry({ entry: e }: { entry: Reported }) {
  const delay = useAlarmPhase(e.level === "alarm", e.startedAt);
  return (
    <button type="button" className="fd-alerts-entry" data-level={e.level} onClick={e.open}>
      <span className="fd-alerts-tag" aria-hidden="true" style={delay ? ({ "--fd-alarm-delay": delay } as CSSProperties) : undefined}>{e.level === "alarm" ? <IconAlarm /> : <IconUrgent />}{WORD[e.level]}</span>
      <span className="fd-alerts-what"><span className="fd-sr">{WORD[e.level]}: </span><b>{e.name}</b><span> · {e.what}</span></span>
    </button>
  );
}

/** Shown at once, before "+N more". */
const SHOWN = 3;

const IconAlarm = () => <svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3 1.5v5.5M6 1.5v5.5M9 1.5v5.5M3 9.5v.5M6 9.5v.5M9 9.5v.5" /></svg>;
const IconUrgent = () => <svg viewBox="0 0 12 12" aria-hidden="true"><path d="M6 1.5 11 10.5H1Z" /><path d="M6 5v2.5M6 8.75v.25" /></svg>;
const WORD: Record<Pressing, string> = { alarm: "Alarm", urgent: "Urgent" };

/**
 * The dashboard's alert line: every alarm and urgent warning its modules report, on a strip of screen under the title,
 * so one below the fold still shows. Alarms first, then the newest. Each entry is its level, boxed with its glyph and
 * word, then the module's name and what is wrong; a tap opens the module's details. Three show, then "+N more".
 * Nothing shows while nothing is pressing.
 */
export function AlertLine() {
  const entries = useContext(EntriesContext);
  const [all, setAll] = useState(false);
  const list = Object.values(entries).sort((a, b) => (a.level === b.level ? b.since - a.since : a.level === "alarm" ? -1 : 1));
  if (!list.length) return null;
  const more = list.length - SHOWN;
  return (
    <section className="fd-alerts" aria-label="Alerts">
      {(all ? list : list.slice(0, SHOWN)).map((e) => <Entry key={`${e.name}-${e.since}`} entry={e} />)}
      {more > 0 && (
        <button type="button" className="fd-alerts-entry fd-alerts-more" aria-expanded={all} onClick={() => setAll((a) => !a)}>
          <span className="fd-alerts-what">{all ? "Show fewer" : `+${more} more`}</span>
        </button>
      )}
    </section>
  );
}
