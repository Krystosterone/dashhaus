import type { OwletEntity, OwletHistory } from "../../../../domains/owlet/types";
import { HeartIcon, OwletIcon } from "./icons";
import { ALERT_WORD, SLEEP_WORD, VITAL_ALERTS, fmtBpm, fmtOxygen, normalize, rankAlerts } from "./readings";
import { AlertStatus, CardTitle, Readout, SheetClose, TogglePill, UnavailableSlot, TodayStrip, fmtDuration, paint, useCard, detailsSheet } from "../../shared/ui";
import type { CardProps, ColorProp, SheetProps } from "../../shared/ui";
import "./OwletCard.css";

export interface OwletCardProps extends CardProps {
  entity: OwletEntity;
  /** Today's sleep on the featured footprint; heart rate and oxygen too in the sheet. */
  history?: OwletHistory;
  /** Card only: the name and the readings open the details sheet. */
  onOpenDetails?: () => void;
  /** The icon's colour, if any. Default: none (a bare icon). */
  color?: ColorProp;
  /** Sheet only: switch the base station on or off. Omit, or leave `baseOn` unset, to hide it. */
  onBaseToggle?: () => void;
}

/**
 * An Owlet Smart Sock: the baby's sleep state, heart rate and oxygen saturation. A reading: neutral,
 * a bare icon in place of an orb, and no glow. It reports nothing while the sock charges.
 * While readings arrive, the heart beside the heart rate beats; once they stop, it stands still, the figures
 * dim, and the status line warns since when. The base station's alerts show too: a vitals alert fills the slot
 * in warn, a problem with the sock or base leads the status line. The base station is switched in the sheet only:
 * a stray tap on a dashboard must never silence a baby monitor.
 */
export function OwletCard({ entity: e, history, variant, footprint, showControl, onOpenDetails, onClose, color, onBaseToggle }: OwletCardProps) {
  const { nameId, sheet, compact, bare, article, area } = useCard("ow", { variant, footprint, showControl, area: e.area });
  const sleep = e.state === "unavailable" ? undefined : e.state;
  const hr = e.heartRate, o2 = e.oxygen;
  // Off the network or charging: nothing to show. A sleep state or a reading alone still shows.
  const offline = sleep == null && hr == null && o2 == null;
  const colors = paint("reading", 0, null, color);

  // A vitals alert is the alarm going off: the slot fills with warn, like a triggered security alarm, whatever
  // else the card would show. A device problem, or readings that stopped, leads the status line with the warn
  // marker. Never a glow, and always in words.
  const { vitals, problems } = rankAlerts(e.alerts);
  const vital = vitals[0];
  const problem = problems[0];
  const stale = !offline && e.live === false;
  const staleText = `No new reading${e.lastUpdated ? ` since ${e.lastUpdated}` : ""}`;
  const staleTime = e.lastUpdated?.trim().split(/\s+/).at(-1);
  // Narrow cards keep the time, the part users need, rather than clipping a day plus time mid-phrase.
  const staleWords = <><span className="ow-st-l">{staleText}</span><span className="ow-st-s">{staleTime ? `Stopped ${staleTime}` : "Stopped"}</span></>;
  const problemLabel = problem ? `Warning: ${ALERT_WORD[problem]} on ${e.name}'s sock` : stale ? `Warning: ${e.name}'s sock has sent no new reading${e.lastUpdated ? ` since ${e.lastUpdated}` : ""}` : null;
  const vitalFigure = !vital ? null : vital.endsWith("oxygen") ? (o2 != null ? `${fmtOxygen(o2)}% O₂` : null) : hr != null ? `${fmtBpm(hr)} bpm` : null;
  // The most urgent alert and its figure first, so an ellipsis only ever takes the others.
  const vitalText = vital ? [ALERT_WORD[vital], vitalFigure, ...vitals.slice(1).map((a) => ALERT_WORD[a])].filter(Boolean).join(" · ") : null;

  const sleepWord = sleep ? SLEEP_WORD[sleep] : "Sleep state unknown";
  const readings = [hr != null ? `${fmtBpm(hr)} bpm` : null, o2 != null ? `${fmtOxygen(o2)}% O₂` : null].filter(Boolean).join(" · ");
  const figures = [hr != null ? `heart rate ${fmtBpm(hr)} beats per minute` : null, o2 != null ? `oxygen ${fmtOxygen(o2)} percent` : null].filter(Boolean).join(", ");
  const spoken = !figures ? "no reading yet" : e.live ? `live, ${figures}` : stale ? `${figures}, ${staleText.toLowerCase()}` : figures;
  const where = sheet && area ? `${area} · ${sleepWord}` : sleepWord;
  // Off, the base sounds no alarm while the sock may still read: said in words, after any warning.
  const baseOff = e.baseOn === false;
  const status = problem ? <><AlertStatus label={problemLabel!}>{ALERT_WORD[problem]}</AlertStatus>{!offline && <span className="ow-st-l"> · {sleepWord}</span>}</>
    // A compact row's alarm pill only has room for the alert's name, so the figures move up here.
    : vital && compact && readings ? readings
    : stale ? <><AlertStatus label={problemLabel!}>{staleWords}</AlertStatus><span className="ow-st-l"> · {sleepWord}</span></>
    : offline ? (e.charging ? "Charging" : "Unavailable")
    : baseOff ? <>Base station off<span className="ow-st-l"> · {sleepWord}</span></>
    : where;
  // Under 320px a compact row keeps only this line, so it carries the alert, the sleep state and the readings.
  const subText = offline ? (problem ? ALERT_WORD[problem] : e.charging ? "Charging" : "Unavailable") : [sleep ? SLEEP_WORD[sleep] : null, readings || "No reading yet"].filter(Boolean).join(" · ");
  const sub = vitalText ? <AlertStatus label={`Alert: ${vitalText} on ${e.name}'s sock`}>{vitalText}</AlertStatus>
    : problemLabel ? <AlertStatus label={problemLabel}>{subText}</AlertStatus>
    : subText;

  const bar = (
    <span className="hd-bar ow-bar">
      {hr != null && (
        <span className="hd-metric ow-metric ow-metric--heart">
          <span className="ow-heart" data-live={e.live || undefined}><HeartIcon /></span>
          <span className="hd-label ow-label"><span className="hd-label-long">Heart rate</span><span className="hd-label-short">Heart</span></span>
          <span className="ow-value">{fmtBpm(hr)}<small>bpm</small></span>
        </span>
      )}
      {o2 != null && (
        <span className="hd-metric ow-metric ow-metric--oxygen">
          <span className="hd-label ow-label">Oxygen</span>
          <span className="ow-value">{fmtOxygen(o2)}<small>%<span className="ow-compact-unit"> O₂</span></small></span>
        </span>
      )}
      {hr == null && o2 == null && <span className="hd-none">No reading yet</span>}
    </span>
  );

  const hrSeries = history?.heartRate ? normalize(history.heartRate) : null;
  const o2Series = history?.oxygen ? normalize(history.oxygen) : null;
  const lowHigh = (s: { min: number | null; max: number | null }, unit: string) =>
    s.min == null || s.max == null ? "No readings yet today" : `Low ${Math.round(s.min)}${unit} · High ${Math.round(s.max)}${unit}`;
  const alerts = [...vitals, ...problems];

  // "unknown" while the sock reads but has no sleep state: live readings, never dimmed like an unavailable card.
  return (
    <article {...article} data-state={offline ? "unavailable" : sleep ?? "unknown"} data-alert={vital ? "alarm" : problemLabel ? "warn" : undefined} data-stale={stale || undefined} {...colors}>
      <header className="hd-head">
        <span className="hd-orb hd-orb--static" aria-hidden="true" aria-disabled={offline || undefined}>
          <span className="hd-orb-i"><OwletIcon off={offline} /></span>
        </span>
        <CardTitle id={nameId} name={e.name} onOpen={sheet ? undefined : onOpenDetails}>
          <p className="hd-area">{status}</p>
          {compact && <p className="hd-sub">{sub}</p>}
        </CardTitle>
        {sheet && <SheetClose label={`Close ${e.name}`} onClick={onClose} />}
      </header>

      <div className="hd-slot">
        {vital ? (
          <div className="ow-alarm" role="alert">
            <span className="ow-alarm-l"><b>{ALERT_WORD[vital]}</b>{vitals.length > 1 && <span className="ow-alarm-c"> · {vitals.slice(1).map((a) => ALERT_WORD[a]).join(" · ")}</span>}</span>
            {vitalFigure && <span className="ow-alarm-v">{vitalFigure}</span>}
          </div>
        ) : bare ? <p className="hd-val">{offline ? subText : readings || "No reading yet"}</p> : offline ? <UnavailableSlot lastSeen={e.lastSeen} />
          : sheet || !onOpenDetails ? <Readout label={spoken}>{bar}</Readout>
          : <Readout label={`${e.name}: ${spoken}`} onOpen={onOpenDetails}>{bar}</Readout>}
      </div>

      {sheet && alerts.length > 0 && (
        <section className="ow-alerts" aria-labelledby={`${nameId}-a`}>
          <h3 className="hd-blk-h" id={`${nameId}-a`}>Alerts</h3>
          <ul>{alerts.map((a) => <li key={a}><AlertStatus label={VITAL_ALERTS.has(a) ? "Alert" : "Warning"}>{ALERT_WORD[a]}</AlertStatus></li>)}</ul>
        </section>
      )}

      {sheet && e.baseOn != null && onBaseToggle && (
        <section className="hd-blk ow-base" aria-labelledby={`${nameId}-b`}>
          <h3 className="hd-blk-h" id={`${nameId}-b`}>Base station</h3>
          <TogglePill label={`Base station: ${e.baseOn ? "On · Turn off" : "Off · Turn on"}`} on={e.baseOn} onToggle={onBaseToggle} extra={e.baseOn ? "Turn off" : "Turn on"}>
            {e.baseOn ? "On" : "Off"}
          </TogglePill>
        </section>
      )}

      {history && (
        <TodayStrip
          title={sheet ? "Sleep today" : "Today"}
          samples={history.sleep}
          currentHour={history.currentHour}
          summary={offline ? `Unavailable since ${e.lastSeen ?? "earlier"}` : history.asleepMinutes > 0 ? `Asleep ${fmtDuration(history.asleepMinutes)}` : "Not asleep today"}
        />
      )}

      {sheet && (hrSeries || o2Series) && (
        <div className="hd-extra">
          {hrSeries && <TodayStrip title="Heart rate today" samples={hrSeries.samples} currentHour={history!.currentHour} summary={lowHigh(hrSeries, " bpm")} />}
          {o2Series && <TodayStrip title="Oxygen today" samples={o2Series.samples} currentHour={history!.currentHour} summary={lowHigh(o2Series, "%")} />}
        </div>
      )}

      {sheet && (
        <p className="hd-info">
          <span>{offline ? `Last seen ${e.lastSeen ?? "unknown"}` : e.lastUpdated ? `${e.live ? "Live · u" : "U"}pdated ${e.lastUpdated}` : ""}</span>
          <span>{offline ? [e.charging ? "Charging" : null, e.area].filter(Boolean).join(" · ") : ""}</span>
        </p>
      )}
    </article>
  );
}

export type OwletSheetProps = SheetProps<OwletCardProps>;

export const OwletSheet = detailsSheet(OwletCard);
