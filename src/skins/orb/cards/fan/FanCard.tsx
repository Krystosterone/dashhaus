import type { FanDirection, FanEntity, FanHistory } from "@dashhaus/core/entities/fan/types";
import { percentOf, speedText } from "@dashhaus/core/entities/fan/speed";
import { DIRECTION_LABEL, fanAbilities, fanMode, presetLabel } from "@dashhaus/core/entities/fan/labels";
import { lastChangedFact, lastSeenFact, sinceFact, unavailableSince } from "@dashhaus/core/entities/facts";
import { FanIcon } from "./icons";
import { SpeedBar } from "./parts";
import { Orb, CardTitle, SheetClose, TogglePill, UnavailableSlot, TodayStrip, ChoiceChips, Facts, fmtDuration, paint, useCard, detailsSheet } from "../../shared/ui";
import type { CardProps, SheetProps } from "../../shared/ui";
import "./FanCard.css";

export interface FanCardProps extends CardProps {
  entity: FanEntity;
  /** Shown in the featured footprint and in the sheet. */
  history?: FanHistory;
  /** The orb, and the pill of a fan without speeds. */
  onToggle: () => void;
  /** The speed groove, in percent. Omit, or a fan without speeds, and the slot is the On/Off pill. */
  onPercentageChange?: (percent: number) => void;
  /** Sheet: the preset chips. */
  onPresetChange?: (preset: string) => void;
  /** Sheet: oscillation, Off or On. */
  onOscillateChange?: (oscillating: boolean) => void;
  /** Sheet: a ceiling fan's direction. */
  onDirectionChange?: (direction: FanDirection) => void;
}

const ON_OFF = [{ value: "off", label: "Off" }, { value: "on", label: "On" }] as const;
const DIRECTIONS = (["forward", "reverse"] as const).map((value) => ({ value, label: DIRECTION_LABEL[value] }));

/**
 * One fan (`fan.*`). It uses the same card anatomy and footprint matrix as every other card: the orb switches it;
 * the slot is the light card's groove, counted in the fan's speeds, or an On/Off pill for a fan without speeds;
 * the name, or a press and hold on the orb, opens the sheet with its presets, oscillation, direction and today.
 */
export function FanCard({ entity: e, history, variant, footprint, showControl, onToggle, onPercentageChange, onPresetChange, onOscillateChange, onDirectionChange, onOpenDetails, onClose, color }: FanCardProps) {
  const { uid, nameId, sheet, compact, bare, article, area } = useCard("fn", { variant, footprint, showControl, area: e.area });
  const unav = e.state === "unavailable";
  const on = e.state === "on";
  // A state: on is the accent, with no glow. Moving air is not light, heat or daylight, so a fan never claims the
  // energy bloom (attention-budget skill); the groove's fill and its words say how fast it runs.
  const colors = paint("state", 0, null, color);

  const count = e.speedCount ?? 0;
  const groove = !!(e.supportsSpeed && count >= 2 && onPercentageChange);
  const speed = on && e.supportsSpeed && e.percentage != null && count >= 2 ? speedText(e.percentage, count) : null;
  // The state word, once: the groove or the pill carries it, the compact row says it under the name.
  const word = unav ? "Unavailable" : !on ? "Off" : speed ?? "On";
  // The pill's second voice: what tapping does, or how long it has run.
  const cue = on ? sinceFact(e.lastChanged) : "Turn on";
  // The status line names what it runs as, after the room: its preset, or that it sweeps.
  const mode = fanMode(e);
  // With no room to name (a titled bundle's lid names it), the status line carries its own detail.
  const since = unav ? e.lastSeen : e.lastChanged;
  const detail = mode ?? sinceFact(since) ?? null;

  const extras = !unav && (
    (e.supportsPreset && e.presetModes && onPresetChange) || (e.supportsOscillate && onOscillateChange) || (e.supportsDirection && onDirectionChange)
  );

  return (
    <article {...article} data-state={e.state} {...colors}>
      <header className="hd-head">
        <Orb label={e.name} pressed={on} unavailable={unav} intensity={0.7} onToggle={onToggle} onLongPress={sheet ? undefined : onOpenDetails}>
          <FanIcon />
        </Orb>
        <CardTitle id={nameId} name={e.name} onOpen={sheet ? undefined : onOpenDetails}>
          <p className="hd-area" title={area}>{area ? <>{area}{mode && <span className="fn-mode"> · {mode}</span>}</> : !sheet && detail}</p>
          {compact && <p className="hd-sub">{word}</p>}
        </CardTitle>
        <p className={`hd-num hd-num--control-duplicate${speed?.endsWith("%") ? "" : " fn-word"}`} aria-hidden="true">
          {unav ? null : speed?.endsWith("%") ? <>{speed.slice(0, -1)}<span>%</span></> : word}
        </p>
        {sheet && <SheetClose label={`Close ${e.name}`} onClick={onClose} />}
      </header>

      <div className="hd-slot">
        {bare ? <p className="hd-val">{word}</p> : unav
          ? <UnavailableSlot lastSeen={e.lastSeen} />
          : groove
            ? <SpeedBar id={`${uid}-speed`} label={`${e.name} speed`} percent={on && e.percentage != null ? e.percentage : percentOf(1, count)} count={count} on={on} onChange={onPercentageChange!} />
            : <TogglePill label={`${e.name}: ${word}${cue ? ` · ${cue}` : ""}`} on={on} onToggle={onToggle} extra={cue}>{word}</TogglePill>}
      </div>

      {sheet && extras && (
        <div className="hd-extra">
          {e.supportsPreset && e.presetModes && onPresetChange && (
            <ChoiceChips id={`${uid}-p`} label="Preset" options={e.presetModes.map((p) => ({ value: p, label: presetLabel(p) }))} value={e.presetMode} onChange={onPresetChange} />
          )}
          {e.supportsOscillate && onOscillateChange && (
            <ChoiceChips id={`${uid}-o`} label="Oscillation" options={[...ON_OFF]} value={e.oscillating == null ? null : e.oscillating ? "on" : "off"} onChange={(v) => onOscillateChange(v === "on")} />
          )}
          {e.supportsDirection && onDirectionChange && (
            <ChoiceChips id={`${uid}-d`} label="Direction" options={DIRECTIONS} value={e.direction} onChange={onDirectionChange} />
          )}
        </div>
      )}

      {history && (
        <TodayStrip
          samples={history.samples}
          currentHour={history.currentHour}
          summary={unav ? unavailableSince(e.lastSeen) : history.onMinutes > 0 ? `On ${fmtDuration(history.onMinutes)}` : "Not on today"}
        />
      )}

      {sheet && (
        <Facts start={unav ? lastSeenFact(e.lastSeen) : lastChangedFact(e.lastChanged)} end={fanAbilities(e)} />
      )}
    </article>
  );
}

export type FanSheetProps = SheetProps<FanCardProps>;

/** The fan's detail view in a modal sheet. */
export const FanSheet = detailsSheet(FanCard);
