import { useId } from "react";
import type { ReactNode } from "react";
import type { FanDirection } from "@dashhaus/core/entities/fan/types";
import type { DysonEntity, DysonHistory } from "@dashhaus/core/entities/dyson/types";
import { canSwitchFan } from "@dashhaus/core/entities/fan/power";
import { percentOf, speedOf } from "@dashhaus/core/entities/fan/speed";
import { speedValueText } from "@dashhaus/core/entities/fan/labels";
import { AIR_BAND_WORD, FILTER_CHANGE_AT, FILTER_LABEL, POLLUTANT_WORDS, airBand, airText, airWord, dysonAir, dysonWarning } from "@dashhaus/core/entities/dyson/air";
import { AIRFLOW_LABEL, DYSON_LOCAL_ANGLES, DYSON_SPREADS, aimAngles, aimWords, dysonAbilities, dysonMode, oscillationChoice, spreadLabel } from "@dashhaus/core/entities/dyson/labels";
import { NO_READING_YET, lastChangedFact, lastSeenFact, sinceFact } from "@dashhaus/core/entities/facts";
import { fmt1 } from "@dashhaus/core/entities/format";
import { todaySummary } from "@dashhaus/core/entities/today";
import { Blank, Channel, Dial, Digits, Fader, Key, KeyGroup, Legend, ModuleFrame, ModuleRow, Pictogram, Steps, Today, Warn, choices, useDetails } from "../../shared/ui";
import type { FieldFootprint } from "../../shared/ui";
import { DYSON_PICT, DysonCable, IconDyson, IconMoon, IconFlame } from "./icons";
import "./DysonModule.css";

export interface DysonModuleProps {
  entity: DysonEntity;
  footprint?: FieldFootprint;
  /** Today, for the detail panel. Omit to leave its meter dark. */
  history?: DysonHistory;
  onToggle: () => void;
  /** The speed fader, in percent; it leaves Auto. Omit, or a Dyson without speeds, and the key spans the row. */
  onPercentageChange?: (percent: number) => void;
  /** Panel: Auto or Manual. */
  onAutoChange?: (auto: boolean) => void;
  /** Panel: oscillation off, or on where it has no range of its own. */
  onOscillateChange?: (oscillating: boolean) => void;
  /** Panel: the range it sweeps, which starts it (a Humidify+Cool's own ranges). */
  onOscillationModeChange?: (mode: string) => void;
  /** Panel: where a Pure Cool or Hot+Cool points, on the dial, its width kept. */
  onAimChange?: (aim: number) => void;
  /** Panel: how widely it sweeps round where it points, on the keys: 0 holds it still. */
  onSpreadChange?: (spread: number) => void;
  /** Panel: its airflow, out of the front or the back. */
  onDirectionChange?: (direction: FanDirection) => void;
  /** Panel: night mode's latching key. */
  onNightModeChange?: (on: boolean) => void;
  /** Panel: a Hot+Cool's heat key. */
  onHeatChange?: (on: boolean) => void;
  /** Panel: what it heats to, while heat is on. */
  onHeatTargetChange?: (temperature: number) => void;
  /** Open the detail panel on first render (stories). */
  defaultOpen?: boolean;
}

/** Held still, the dial lights its scale this far either side of where it points. */
const BEAM = 8;
const MODES = [{ value: true, label: "Auto" }, { value: false, label: "Manual" }] as const;
const AIRFLOWS: FanDirection[] = ["forward", "reverse"];
const degrees = (value: number, unit?: string) => `${fmt1(value).replace(/\.0$/, "")}${unit === "°F" ? "°F" : "°"}`;

/**
 * One Dyson purifier fan as a field module: the fan's module, composed with its device's air sensors, filters, night
 * mode and, on a Hot+Cool, its heater. The key switches it and its LED says on; the fader sets one of its ten speeds and
 * has no thumb while it runs in Auto, choosing its own. The screen's loop fills with the speed; beside it the step
 * (`04/10`), `AUTO` or `OFF`, then what it runs as or how the air is (`Air good`), behind the warning marker while the
 * air is poor or a filter is worn, and since when. Its panel: the air on the screen's second channel, Auto or Manual,
 * the oscillation and its range, the airflow, night mode, heat and its target, every reading in Dyson's bands, the
 * filters, and today.
 */
export function DysonModule({ entity: e, footprint = "standard", history, onToggle, onPercentageChange, onAutoChange, onOscillateChange, onOscillationModeChange, onAimChange, onSpreadChange, onDirectionChange, onNightModeChange, onHeatChange, onHeatTargetChange, defaultOpen = false }: DysonModuleProps) {
  const uid = useId();
  const details = useDetails(defaultOpen);
  const unav = e.state === "unavailable";
  const on = e.state === "on";
  // As the fan's: one that doesn't declare the way a press would switch it keeps its key flat.
  const stuck = !unav && !canSwitchFan(e);
  const auto = on && !!e.auto;
  const count = e.speedCount ?? 0;
  const speedy = !!(e.supportsSpeed && count >= 2);
  // In Auto or off, Home Assistant reports no speed: the fader has no thumb, and a slide sets one, leaving Auto.
  const speed = on && !auto && e.percentage != null && speedy ? speedOf(e.percentage, count) : null;
  const pct = speed == null ? null : percentOf(speed, count);

  const air = dysonAir(e);
  const warning = dysonWarning(e);
  const warnWords = warning && <><span className="fd-sr">{warning.said}</span><span aria-hidden="true">{warning.word}</span></>;

  const read: ReactNode = unav ? <Blank label="Unavailable" />
    : !on ? "OFF"
    : auto ? "AUTO"
    : speed != null ? <><Digits value={speed} places={String(count).length} /><small aria-hidden="true">/{count}</small><span className="fd-sr"> of {count}</span></>
    : "ON";
  const first = warnWords ? <Warn>{warnWords}</Warn> : dysonMode(e) ?? airWord(air);
  const since = unav ? (e.lastSeen ? lastSeenFact(e.lastSeen) : undefined) : sinceFact(e.lastChanged);
  const meta: [ReactNode, ReactNode?] | undefined = unav ? ["Unavailable", since] : first ? [first, since] : since ? [since] : undefined;

  // The loop lights whenever it runs, and fills with the speed (whole in Auto, whose speed isn't said).
  const pict = <Pictogram level={pct != null ? 0.25 + 0.75 * (pct / 100) : 1} lit={on}>{DYSON_PICT}</Pictogram>;
  const openPanel = details.openDetails;
  const faded = speedy && !unav && !!onPercentageChange;
  const at = speed ?? 1;
  const controls = (where: "m" | "p") => (
    <ModuleRow className="fd-dy-row" solo={!faded}>
      <Key label={e.name} pressed={on} unavailable={unav || stuck} onPress={onToggle} onHold={openPanel} wide={!faded} caption={!faded && !unav ? (on ? "On" : "Off") : undefined}>
        <IconDyson />
      </Key>
      {faded && (
        <Fader
          id={`${uid}-${where}`}
          label={`${e.name} speed`}
          legend={auto ? "Speed · Auto" : "Speed"}
          value={at}
          min={1}
          max={count}
          lit={on && !auto}
          empty={speed == null}
          valueText={auto ? "Auto, choosing its own speed" : speedValueText(at, count, on)}
          onChange={(next) => onPercentageChange?.(percentOf(next, count))}
        />
      )}
    </ModuleRow>
  );

  // The panel's second channel: the air overall, in Dyson's band.
  const aside = !unav && e.air.length ? (
    <Channel name={air ? (warning?.kind === "air" ? <Warn>{AIR_BAND_WORD[air.band]}</Warn> : AIR_BAND_WORD[air.band]) : <Blank places={3} label={NO_READING_YET} />} sub="Air" />
  ) : undefined;

  // A Pure Cool or Hot+Cool aims on its angles: Off, Still or a width on the keys, where it points on the dial. Any other
  // sweeps its own ranges, or switches oscillation on and off.
  const range = e.angles ?? DYSON_LOCAL_ANGLES;
  const aimable = (e.oscillationBy === "angle" || e.oscillationBy === "number") && onAimChange && onSpreadChange
    && e.oscillationLow != null && e.oscillationHigh != null;
  const spread = aimable ? e.oscillationHigh! - e.oscillationLow! : 0;
  const sweeps = !aimable && e.oscillationModes?.length && onOscillationModeChange ? e.oscillationModes : undefined;
  const oscillation = ["off", ...(aimable ? DYSON_SPREADS.map(spreadLabel) : sweeps ?? ["on"])];
  const swept = aimable ? (e.oscillating == null ? null : !e.oscillating ? "off" : spread === 0 ? "Still" : e.oscillationMode ?? null)
    : oscillationChoice({ ...e, oscillationModes: sweeps });
  const pickOscillation = (v: string) => {
    if (v === "off") return onOscillateChange?.(false);
    if (v === "on") return onOscillateChange?.(true);
    if (aimable) return onSpreadChange!(DYSON_SPREADS.find((d) => spreadLabel(d) === v) ?? 0);
    onOscillationModeChange?.(v);
  };
  const optionWord = (v: string) => (v === "off" ? "Off" : v === "on" ? "On" : v);
  const optionSaid = (v: string) => (v === "off" ? "Stop oscillating" : v === "on" ? "Oscillate" : v === "Still" ? "Hold still" : `Oscillate ${v}`);

  const readings: [key: string, label: string, value: string, warns?: boolean, band?: string][] = [
    ...e.air.map((r): [string, string, string, boolean, string | undefined] => {
      const band = r.value == null ? undefined : airBand(r.pollutant, r.value);
      return [r.pollutant, POLLUTANT_WORDS[r.pollutant].label, r.value == null ? NO_READING_YET : airText(r), band === "poor" || band === "very_poor", band && AIR_BAND_WORD[band]];
    }),
    ...(e.temperature != null ? [["temperature", "Temperature", degrees(e.temperature, e.temperatureUnit)] as [string, string, string]] : []),
    ...(e.humidity != null ? [["humidity", "Humidity", `${Math.round(e.humidity)}%`] as [string, string, string]] : []),
  ];
  const today = history && (unav ? "Unavailable" : todaySummary("on", history.onMinutes));

  return (
    <ModuleFrame
      kind="fd-dy"
      name={e.name}
      area={e.area}
      footprint={footprint}
      state={e.state}
      // A compact row has no meta lines: the warning takes the area's line, behind its marker.
      warning={footprint === "compact" ? warnWords : undefined}
      details={details}
      pict={pict}
      read={read}
      meta={meta}
      lead={<Key label={e.name} pressed={on} unavailable={unav || stuck} onPress={onToggle} onHold={openPanel}><IconDyson /></Key>}
      controls={controls}
      aside={aside}
      facts={{ start: unav ? lastSeenFact(e.lastSeen) : lastChangedFact(e.lastChanged), end: dysonAbilities(e) }}
    >
      {e.supportsAuto && onAutoChange && (
        <KeyGroup legend="Mode" value={e.auto == null ? undefined : e.auto ? "Auto" : "Manual"} columns={2}>
          {MODES.map((m) => (
            <Key key={m.label} label={`Set mode to ${m.label}`} wide caption={m.label} chosen={e.auto === m.value} disabled={unav} onPress={() => onAutoChange(m.value)}>{null}</Key>
          ))}
        </KeyGroup>
      )}

      {e.supportsOscillate && onOscillateChange && (
        <KeyGroup legend="Oscillation" value={swept == null ? undefined : optionWord(swept)} columns={choices(oscillation.length)} narrow={2}>
          {oscillation.map((v) => (
            <Key key={v} label={optionSaid(v)} wide caption={optionWord(v)} chosen={v === swept} disabled={unav} onPress={() => pickOscillation(v)}>{null}</Key>
          ))}
        </KeyGroup>
      )}

      {aimable && e.oscillating && !unav && (
        <Dial
          id={`${uid}-aim`}
          label={`${e.name} aims`}
          legend="Points"
          says={(aim) => aimWords(aim, range.ahead)}
          valueText={(aim) => `Points ${aimWords(aim, range.ahead)}${spread ? `, sweeping ${spread}°` : ""}`}
          value={Math.round((e.oscillationLow! + e.oscillationHigh!) / 2)}
          min={range.min}
          max={range.max}
          top={range.ahead}
          topLabel="Ahead"
          param="b"
          // Lit where it sweeps round the aim, inside its range; a few ticks either side while it holds still.
          lit={(aim) => {
            if (!spread) return [aim - BEAM, aim + BEAM];
            const { angle_low, angle_high } = aimAngles(aim, spread, range);
            return [angle_low, angle_high];
          }}
          onChange={onAimChange!}
        >
          {() => <DysonCable back={(range.max + range.min + 360) / 2 - range.ahead} />}
        </Dial>
      )}

      {e.supportsDirection && onDirectionChange && (
        <KeyGroup legend="Airflow" value={e.direction ? AIRFLOW_LABEL[e.direction] : undefined} columns={2}>
          {AIRFLOWS.map((d) => (
            <Key key={d} label={`Airflow ${AIRFLOW_LABEL[d].toLowerCase()}`} wide caption={AIRFLOW_LABEL[d]} chosen={d === e.direction} disabled={unav} onPress={() => onDirectionChange(d)}>{null}</Key>
          ))}
        </KeyGroup>
      )}

      {/* Night mode and heat latch, each half the panel's width, so each reads as one key and not a bar. */}
      {((e.supportsNightMode && onNightModeChange) || (e.supportsHeat && onHeatChange)) && (
        <KeyGroup legend={e.supportsHeat && onHeatChange ? "Night mode · Heat" : "Night mode"} columns={2}>
          {e.supportsNightMode && onNightModeChange && (
            <Key label="Night mode" pressed={e.nightMode === true} unavailable={unav || e.nightMode == null} wide caption={unav || e.nightMode == null ? undefined : e.nightMode ? "Night on" : "Night off"} onPress={() => onNightModeChange(!e.nightMode)}>
              <IconMoon />
            </Key>
          )}
          {e.supportsHeat && onHeatChange && (
            <Key label="Heat" pressed={e.heatOn === true} unavailable={unav || e.heatOn == null} wide caption={unav || e.heatOn == null ? undefined : e.heatOn ? "Heat on" : "Heat off"} onPress={() => onHeatChange(!e.heatOn)}>
              <IconFlame />
            </Key>
          )}
        </KeyGroup>
      )}

      {/* Its target in exact steps, as the climate module's: the fader's second colour is the dial's. */}
      {e.supportsHeat && e.heatOn && e.heatTarget != null && onHeatTargetChange && !unav && (() => {
        const step = e.heatStep ?? 1;
        const down = Math.max(e.heatMin ?? 1, e.heatTarget - step);
        const up = Math.min(e.heatMax ?? 37, e.heatTarget + step);
        return (
          <Steps
            group={`${e.name}, heat to`}
            label="Heat to"
            value={degrees(e.heatTarget, e.heatUnit)}
            downLabel={`Lower heat target to ${degrees(down, e.heatUnit)}`}
            upLabel={`Raise heat target to ${degrees(up, e.heatUnit)}`}
            atMin={e.heatTarget <= (e.heatMin ?? 1)}
            atMax={e.heatTarget >= (e.heatMax ?? 37)}
            onDown={() => onHeatTargetChange(down)}
            onUp={() => onHeatTargetChange(up)}
          />
        );
      })()}

      {!unav && readings.length > 0 && (
        <div className="fd-block">
          <Legend value={air ? AIR_BAND_WORD[air.band] : undefined}>Air quality</Legend>
          <dl className="fd-dy-list">
            {readings.map(([key, label, value, warns, band]) => (
              <div key={key} className="fd-dy-item">
                <dt>{label}</dt>
                <dd>{warns ? <Warn>{value}</Warn> : value}{band && <span className="fd-dy-band">{band}</span>}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {!unav && e.filters.length > 0 && (
        <div className="fd-block">
          <Legend value={warning?.kind === "filter" ? "Change soon" : undefined}>Filters</Legend>
          <dl className="fd-dy-list">
            {e.filters.map((f) => (
              <div key={f.kind} className="fd-dy-item">
                <dt>{FILTER_LABEL[f.kind]}</dt>
                <dd>{f.percent == null ? NO_READING_YET : f.percent <= FILTER_CHANGE_AT ? <Warn>{`${Math.round(f.percent)}%`}</Warn> : `${Math.round(f.percent)}%`}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {history && <Today summary={today} label="On by hour today." tone="neutral" samples={history.samples} currentHour={history.currentHour} />}
    </ModuleFrame>
  );
}
