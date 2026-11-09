import type { FanDirection } from "@dashhaus/core/entities/fan/types";
import type { DysonEntity, DysonHistory } from "@dashhaus/core/entities/dyson/types";
import { percentOf, speedOf, speedText } from "@dashhaus/core/entities/fan/speed";
import { fanWord, speedValueText } from "@dashhaus/core/entities/fan/labels";
import { AIR_BAND_WORD, FILTER_CHANGE_AT, FILTER_LABEL, POLLUTANT_WORDS, airBand, airText, airWord, dysonAir, dysonWarning } from "@dashhaus/core/entities/dyson/air";
import { AIRFLOW_LABEL, DYSON_LOCAL_ANGLES, DYSON_SPREADS, aimAngles, aimWords, dysonAbilities, dysonMode, oscillationChoice, spreadLabel } from "@dashhaus/core/entities/dyson/labels";
import { NO_READING_YET, lastChangedFact, lastSeenFact, sinceFact } from "@dashhaus/core/entities/facts";
import { fmt1 } from "@dashhaus/core/entities/format";
import { todaySummary } from "@dashhaus/core/entities/today";
import { DysonFromAbove, DysonIcon } from "./icons";
import { AlertStatus, CardFrame, ChoiceChips, Dial, LevelBar, SheetBlock, Stepper, Today, TogglePill, detailsSheet, paint, useCard } from "../../shared/ui";
import type { CardProps, SheetProps } from "../../shared/ui";
import "./DysonCard.css";

export interface DysonCardProps extends CardProps {
  entity: DysonEntity;
  /** Shown in the featured footprint and in the sheet. */
  history?: DysonHistory;
  /** The orb, and the pill of a Dyson without speeds. */
  onToggle: () => void;
  /** The speed groove, in percent; it leaves Auto. Omit, or a fan without speeds, and the slot is the On/Off pill. */
  onPercentageChange?: (percent: number) => void;
  /** Sheet: Auto or Manual. */
  onAutoChange?: (auto: boolean) => void;
  /** Sheet: oscillation off, or on where it has no range of its own. */
  onOscillateChange?: (oscillating: boolean) => void;
  /** Sheet: the range it sweeps, which starts it. */
  onOscillationModeChange?: (mode: string) => void;
  /** Sheet: where a Pure Cool or Hot+Cool points, on the dial, its width kept. */
  onAimChange?: (aim: number) => void;
  /** Sheet: how widely it sweeps round where it points, from the chips: 0 holds it still. */
  onSpreadChange?: (spread: number) => void;
  /** Sheet: its airflow, out of the front or the back. */
  onDirectionChange?: (direction: FanDirection) => void;
  /** Sheet: night mode. */
  onNightModeChange?: (on: boolean) => void;
  /** Sheet: a Hot+Cool's heat, on or off. */
  onHeatChange?: (on: boolean) => void;
  /** Sheet: what it heats to, while heat is on. */
  onHeatTargetChange?: (temperature: number) => void;
}

/** Held still, the dial lights its ticks this far either side of where it points. */
const BEAM = 8;
const OFF_ON = [{ value: "off", label: "Off" }, { value: "on", label: "On" }] as const;
const MODES = [{ value: "auto", label: "Auto" }, { value: "manual", label: "Manual" }] as const;
const AIRFLOWS = (["forward", "reverse"] as const).map((value) => ({ value, label: AIRFLOW_LABEL[value] }));
const choice = (on: boolean | undefined, yes = "on", no = "off") => (on == null ? null : on ? yes : no);
const degrees = (value: number, unit: string | undefined) => `${fmt1(value)}${unit === "°F" ? "°F" : "°"}`;

/**
 * One Dyson purifier fan (`fan.*` from `dyson_local`), composed with its device's air sensors, filters, night mode and,
 * on a Hot+Cool, its heater. The fan card's anatomy: the orb switches it; the slot is the speed groove, counted in its
 * ten speeds, which says Auto while it chooses its own; the status line names the room and the air ("Air good"), or
 * what it runs as, and leads with a warning, advisory, while the air is poor or a filter is worn. Heating, it claims
 * the energy bloom, as a heater does; cleaning the air, it is a state with no glow (attention-budget skill). The name,
 * or a press and hold on the orb, opens the sheet: Auto or Manual, the oscillation and its range, the airflow, night
 * mode, heat and its target, then every air reading in Dyson's own bands, the filters, and today.
 */
export function DysonCard({ entity: e, history, variant, footprint, showControl, onToggle, onPercentageChange, onAutoChange, onOscillateChange, onOscillationModeChange, onAimChange, onSpreadChange, onDirectionChange, onNightModeChange, onHeatChange, onHeatTargetChange, onOpenDetails, onClose }: DysonCardProps) {
  const card = useCard("dy", { variant, footprint, showControl, area: e.area });
  const { uid, area } = card;
  const unav = e.state === "unavailable";
  const on = e.state === "on";
  const colors = on && e.heating ? paint("energy", 0.9) : paint("state", 0);

  const count = e.speedCount ?? 0;
  const groove = !!(e.supportsSpeed && count >= 2 && onPercentageChange);
  const auto = on && !!e.auto;
  const speed = on && !auto && e.supportsSpeed && e.percentage != null && count >= 2 ? speedText(e.percentage, count) : null;
  // The state word, once: the groove or the pill carries it, the compact row says it under the name.
  const word = auto ? "Auto" : fanWord(e, speed);
  const cue = on ? sinceFact(e.lastChanged) : "Turn on";

  const air = dysonAir(e);
  const warning = dysonWarning(e);
  const alertLabel = warning ? `Warning: ${e.name}: ${warning.said}` : null;
  // After the room, what it runs as (heating, Auto, Night, the sweep), else how the air is.
  const detail = dysonMode(e) ?? airWord(air);
  const status = unav ? area
    : warning ? <><AlertStatus label={alertLabel!}>{warning.word}</AlertStatus>{area && <span className="hd-sub-optional">{` · ${area}`}</span>}</>
    : area ? <>{area}{detail && <span className="dy-mode"> · {detail}</span>}</>
    : detail;

  // A Pure Cool or Hot+Cool aims on its angles: held still or sweeping, round where it points. Any other sweeps its own
  // ranges, or switches oscillation on and off.
  const aimable = (e.oscillationBy === "angle" || e.oscillationBy === "number") && onSpreadChange && onAimChange;
  const angles = aimable && e.oscillationLow != null && e.oscillationHigh != null
    ? { low: e.oscillationLow, high: e.oscillationHigh } : undefined;
  const sweeps = !angles && e.oscillationModes?.length && onOscillationModeChange ? e.oscillationModes : undefined;
  const oscillation = [
    { value: "off", label: "Off" },
    ...(angles ? DYSON_SPREADS.map((s) => ({ value: spreadLabel(s), label: spreadLabel(s) }))
      : sweeps ? sweeps.map((m) => ({ value: m, label: m }))
      : [{ value: "on", label: "On" }]),
  ];
  const still = angles && angles.low === angles.high;
  const range = e.angles ?? DYSON_LOCAL_ANGLES;
  const spread = angles ? angles.high - angles.low : 0;
  const oscillationValue = angles && e.oscillating ? (still ? "Still" : e.oscillationMode ?? null) : oscillationChoice({ ...e, oscillationModes: sweeps });
  const pickOscillation = (v: string) => {
    if (v === "off") return onOscillateChange?.(false);
    if (v === "on") return onOscillateChange?.(true);
    if (angles) return onSpreadChange!(DYSON_SPREADS.find((s) => spreadLabel(s) === v) ?? 0);
    onOscillationModeChange?.(v);
  };
  const readings = [
    ...e.air.map((r) => ({ key: r.pollutant, label: POLLUTANT_WORDS[r.pollutant].label, long: POLLUTANT_WORDS[r.pollutant].long, value: r.value == null ? NO_READING_YET : airText(r), band: r.value == null ? undefined : AIR_BAND_WORD[airBand(r.pollutant, r.value)] })),
    ...(e.temperature != null ? [{ key: "temperature", label: "Temperature", long: "Temperature", value: degrees(e.temperature, e.temperatureUnit), band: undefined }] : []),
    ...(e.humidity != null ? [{ key: "humidity", label: "Humidity", long: "Humidity", value: `${Math.round(e.humidity)}%`, band: undefined }] : []),
  ];
  const worn = warning?.kind === "filter";

  return (
    <CardFrame
      card={card}
      name={e.name}
      attrs={{ "data-state": e.state, "data-alert": warning ? "warn" : undefined, ...colors }}
      orb={{ label: e.name, pressed: on, intensity: 0.7, onToggle, children: <DysonIcon /> }}
      unavailable={unav}
      lastSeen={e.lastSeen}
      onOpen={onOpenDetails}
      status={status}
      statusTitle={area}
      value={warning ? <><AlertStatus label={alertLabel!}>{warning.word}</AlertStatus>{` · ${word}`}</> : word}
      bareValue={word}
      readout={{ value: unav ? null : speed?.endsWith("%") ? <>{speed.slice(0, -1)}<span>%</span></> : word, duplicate: true, word: !speed?.endsWith("%") }}
      onClose={onClose}
      control={groove
        ? (
          <LevelBar
            id={`${uid}-speed`}
            label={`${e.name} speed`}
            value={speedOf(on && e.percentage != null ? e.percentage : percentOf(1, count), count)}
            min={1}
            max={count}
            on={on && !auto && e.percentage != null}
            wakes
            text={(s) => speedText(percentOf(s, count), count)}
            offText={() => (auto ? "Auto" : "Off")}
            valueText={(s) => (auto ? "Auto, choosing its own speed" : speedValueText(s, count, on))}
            onChange={(s) => onPercentageChange!(percentOf(s, count))}
          />
        )
        : <TogglePill label={`${e.name}: ${word}${cue ? ` · ${cue}` : ""}`} on={on} onToggle={onToggle} extra={cue}>{word}</TogglePill>}
      facts={{ start: unav ? lastSeenFact(e.lastSeen) : lastChangedFact(e.lastChanged), end: dysonAbilities(e) }}
    >
      {!unav && (
        <SheetBlock>
          {e.supportsAuto && onAutoChange && (
            <ChoiceChips id={`${uid}-m`} label="Mode" options={[...MODES]} value={choice(e.auto, "auto", "manual")} onChange={(v) => onAutoChange(v === "auto")} />
          )}
          {e.supportsOscillate && onOscillateChange && (
            <ChoiceChips id={`${uid}-o`} label="Oscillation" options={oscillation} value={oscillationValue} onChange={pickOscillation} />
          )}
          {angles && e.oscillating && (
            <Dial
              id={`${uid}-aim`}
              label={`${e.name} aims`}
              heading="Points"
              says={(aim) => aimWords(aim, range.ahead)}
              valueText={(aim) => `Points ${aimWords(aim, range.ahead)}${spread ? `, sweeping ${spread}°` : ""}`}
              value={Math.round((angles.low + angles.high) / 2)}
              min={range.min}
              max={range.max}
              top={range.ahead}
              topLabel="Ahead"
              // Lit where it sweeps round the aim, kept inside its range; a few ticks either side while it holds still.
              lit={(aim) => {
                if (!spread) return [aim - BEAM, aim + BEAM];
                const { angle_low, angle_high } = aimAngles(aim, spread, range);
                return [angle_low, angle_high];
              }}
              onChange={onAimChange!}
            >
              {(turned) => <DysonFromAbove turned={turned} back={(range.max + range.min + 360) / 2 - range.ahead} />}
            </Dial>
          )}
          {e.supportsDirection && onDirectionChange && (
            <ChoiceChips id={`${uid}-d`} label="Airflow" options={AIRFLOWS} value={e.direction} onChange={onDirectionChange} />
          )}
          {e.supportsNightMode && onNightModeChange && (
            <ChoiceChips id={`${uid}-night`} label="Night mode" options={[...OFF_ON]} value={choice(e.nightMode)} onChange={(v) => onNightModeChange(v === "on")} />
          )}
          {e.supportsHeat && onHeatChange && (
            <ChoiceChips id={`${uid}-heat`} label="Heat" options={[...OFF_ON]} value={choice(e.heatOn)} onChange={(v) => onHeatChange(v === "on")} />
          )}
          {e.supportsHeat && e.heatOn && e.heatTarget != null && onHeatTargetChange && (
            <Stepper label={`${e.name} heat target`} kicker="Heat to" value={e.heatTarget} unit={e.heatUnit === "°F" ? "°F" : "°"} format={(e.heatStep ?? 1) % 1 === 0 ? String : fmt1} min={e.heatMin ?? 1} max={e.heatMax ?? 37} step={e.heatStep ?? 1} onChange={onHeatTargetChange} />
          )}
        </SheetBlock>
      )}
      {!unav && readings.length > 0 && (
        <SheetBlock>
          <div className="hd-blk">
            <p className="hd-blk-h"><span>Air quality</span>{air && <span className="hd-blk-v">{AIR_BAND_WORD[air.band]}</span>}</p>
            <dl className="dy-list">
              {readings.map((r) => (
                <div key={r.key} className="dy-row" data-band={r.band && r.band !== "Good" && r.band !== "Fair" ? "warn" : undefined}>
                  <dt><abbr title={r.long}>{r.label}</abbr></dt>
                  <dd>{r.value}{r.band && <span className="dy-band">{r.band}</span>}</dd>
                </div>
              ))}
            </dl>
          </div>
        </SheetBlock>
      )}
      {!unav && e.filters.length > 0 && (
        <SheetBlock>
          <div className="hd-blk">
            <p className="hd-blk-h"><span>Filters</span>{worn && <span className="hd-blk-v">Change soon</span>}</p>
            <dl className="dy-list">
              {e.filters.map((f) => (
                <div key={f.kind} className="dy-row" data-band={f.percent != null && f.percent <= FILTER_CHANGE_AT ? "warn" : undefined}>
                  <dt>{FILTER_LABEL[f.kind]}</dt>
                  <dd>{f.percent == null ? NO_READING_YET : `${Math.round(f.percent)}%`}</dd>
                </div>
              ))}
            </dl>
          </div>
        </SheetBlock>
      )}
      {history && <Today samples={history.samples} currentHour={history.currentHour} summary={todaySummary("on", history.onMinutes)} />}
    </CardFrame>
  );
}

export type DysonSheetProps = SheetProps<DysonCardProps>;

/** The Dyson's detail view in a modal sheet. */
export const DysonSheet = detailsSheet(DysonCard);
