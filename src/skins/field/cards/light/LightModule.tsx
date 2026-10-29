import { useId } from "react";
import type { ReactNode } from "react";
import type { LightEntity, LightHistory } from "../../../../domains/light/types";
import { kelvinName, K_MIN, K_MAX } from "../../../../domains/light/kelvin";
import { LAMP_COLORS, lampColorOf } from "../../../../domains/light/color";
import type { Hs } from "../../../../domains/light/color";
import { fmtDuration } from "../../../../domains/format";
import { ModuleFrame, Key, Screen, Digits, Blank, Fader, Pictogram, Legend, Swatch, Today, useDetails } from "../../shared/ui";
import type { FieldFootprint } from "../../shared/ui";
import { BULB, IconBulb, LENS, SUN } from "./icons";
import "./LightModule.css";

export interface LightModuleProps {
  entity: LightEntity;
  footprint?: FieldFootprint;
  /** Today, for the detail panel. Omit to leave the panel without it. */
  history?: LightHistory;
  onToggle: () => void;
  onBrightnessChange: (percent: number) => void;
  /** Omit, or a light without colour temperature, and the panel has no warmth fader. */
  onKelvinChange?: (kelvin: number) => void;
  /** Set a colour lamp's colour, as HA `hs_color`. Omit, or a light without colour, and the panel has no colour keys. */
  onColorChange?: (hs: Hs) => void;
  /** Open the detail panel on first render (stories). */
  defaultOpen?: boolean;
}

/** Quick levels: a key each, its figure on the key and its name printed under it. */
const LEVELS = [
  { value: 5, name: "Night" },
  { value: 25, name: "Dim" },
  { value: 50, name: "Half" },
  { value: 100, name: "Full" },
];

/**
 * One light as a field module. The key switches it and its LED says it's on. The screen's bulb fills with the
 * brightness, in brightness's colour, the fader thumb's; beside it the figure, then warmth and since when. The
 * fader sets brightness, and sliding it while off turns the light on. A compact row keeps the key and the screen.
 * The name, or a press and hold on the key, opens the detail panel: quick levels, warmth in its own colour, a
 * colour lamp's colours, today.
 */
export function LightModule({ entity: e, footprint = "standard", history, onToggle, onBrightnessChange, onKelvinChange, onColorChange, defaultOpen = false }: LightModuleProps) {
  const uid = useId();
  const details = useDetails(defaultOpen);
  const unav = e.state === "unavailable";
  const on = e.state === "on";
  const dimmable = e.supportsBrightness;
  // An absent reading keeps the thumb at full and the screen on its plain state word.
  const pct = e.brightness == null ? 100 : Math.min(100, Math.max(1, Math.round(e.brightness)));
  const known = dimmable && e.brightness != null;

  const read = unav ? <Blank label="Unavailable" />
    : !on ? "OFF"
    : known ? <><Digits value={pct} /><small>%</small></>
    : "ON";
  const warmth = on && e.supportsColorTemp && e.kelvin != null ? `${Math.round(e.kelvin / 100) * 100}K`
    : on && e.supportsColor && e.hs ? lampColorOf(e.hs).name
    : null;
  const since = unav ? (e.lastSeen ? `Seen ${e.lastSeen}` : null) : e.lastChanged ? `Since ${e.lastChanged}` : null;
  const meta: [string, string?] | undefined = unav ? ["Unavailable", since ?? undefined] : warmth ? [warmth, since ?? undefined] : since ? [since] : undefined;

  // The bulb's base always lights while on, so a lamp at 3% still reads lit; the rest fills with brightness.
  const pict = <Pictogram level={known ? 0.25 + 0.75 * (pct / 100) : 1} lit={on}>{BULB}</Pictogram>;
  const openPanel = details.openDetails;
  // The power key and the brightness fader, the same in the module and the panel. Unavailable, the brightness isn't
  // known, so the fader goes and the key spans the row, as every field control's does.
  const faded = dimmable && !unav;
  const controls = (where: string) => (
    <div className="fd-lt-row" data-dimmable={faded}>
      <Key label={e.name} pressed={on} unavailable={unav} onPress={onToggle} onHold={openPanel} wide={!faded} caption={!dimmable && !unav ? (on ? "On" : "Off") : undefined}>
        <IconBulb />
      </Key>
      {faded && (
        <Fader
          id={`${uid}-${where}`}
          label={`${e.name} brightness`}
          legend="Brightness"
          value={pct}
          min={1}
          max={100}
          lit={on}
          valueText={on ? `${pct} percent` : `Off. Last set to ${pct} percent`}
          onChange={onBrightnessChange}
        />
      )}
    </div>
  );

  return (
    <ModuleFrame
      kind="fd-lt"
      name={e.name}
      area={e.area}
      footprint={footprint}
      state={e.state}
      details={details}
      pict={pict}
      read={read}
      meta={meta}
      lead={<Key label={e.name} pressed={on} unavailable={unav} onPress={onToggle} onHold={openPanel}><IconBulb /></Key>}
      row={controls("m")}
    >
      <LightDetails e={e} read={read} pict={pict} meta={meta} controls={controls("p")} history={history} onBrightnessChange={onBrightnessChange} onKelvinChange={onKelvinChange} onColorChange={onColorChange} />
    </ModuleFrame>
  );
}

interface DetailsProps {
  e: LightEntity;
  read: ReactNode;
  pict: ReactNode;
  meta?: [string, string?];
  controls: ReactNode;
  history?: LightHistory;
  onBrightnessChange: (percent: number) => void;
  onKelvinChange?: (kelvin: number) => void;
  onColorChange?: (hs: Hs) => void;
}

/**
 * The panel's content: the screen with a second channel (the lamp's colour while it shows one, else its warmth),
 * the controls, quick levels, warmth, colours, today, and facts.
 */
function LightDetails({ e, read, pict, meta, controls, history, onBrightnessChange, onKelvinChange, onColorChange }: DetailsProps) {
  const uid = useId();
  const unav = e.state === "unavailable";
  const on = e.state === "on";
  const min = e.minKelvin ?? K_MIN;
  const max = Math.max(e.maxKelvin ?? K_MAX, min + 100);
  const k = e.kelvin == null ? null : Math.min(max, Math.max(min, Math.round(e.kelvin / 100) * 100));
  const today = history && (unav ? "Unavailable" : history.onMinutes > 0 ? `On ${fmtDuration(history.onMinutes)}` : "Not on today");

  // The colour it shows now: only while on, since Home Assistant reports none while off or on a colour temperature.
  const lamp = on && e.supportsColor && e.hs ? lampColorOf(e.hs) : null;

  // Unavailable, the screen keeps the module's meta lines: "Unavailable" and when it was last seen.
  const aside = unav ? undefined : lamp ? (
    <p className="fd-chan">
      <Pictogram lit lamp={lamp.name}>{LENS}</Pictogram>
      <span>
        <span className="fd-chan-name">{lamp.name}</span>
        <span className="fd-chan-sub">Colour</span>
      </span>
    </p>
  ) : e.supportsColorTemp ? (
    <p className="fd-chan">
      <Pictogram lit={on && k != null} param="b">{SUN}</Pictogram>
      <span>
        {k != null ? <>{k}<small>K</small></> : <Blank places={4} label="No warmth" />}
        <span className="fd-chan-sub">{k != null ? kelvinName(k) : "Warmth"}</span>
      </span>
    </p>
  ) : undefined;

  return (
    <div className="fd-lt-panel" data-state={e.state}>
      <Screen pict={pict} meta={meta} aside={aside}>{read}</Screen>
      {controls}

      {e.supportsBrightness && (
        <div className="fd-block">
          <Legend id={`${uid}-lv`}>Quick levels</Legend>
          <div className="fd-lt-levels" role="group" aria-labelledby={`${uid}-lv`}>
            {LEVELS.map((l) => (
              <div key={l.value} className="fd-lt-level">
                <Key label={`${l.name}, ${l.value}%`} wide disabled={unav} onPress={() => onBrightnessChange(l.value)}>
                  <span className="fd-key-fig">{l.value}</span>
                </Key>
                <span className="fd-lt-level-name" aria-hidden="true">{l.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {e.supportsColorTemp && onKelvinChange && (
        <Fader
          id={`${uid}-k`}
          label={`${e.name} warmth`}
          legend="Warmth"
          value={unav ? undefined : k ?? min}
          min={min}
          max={max}
          step={100}
          lit={on}
          disabled={unav || !on}
          param="b"
          valueText={k == null ? "Not reported" : `${k} kelvin, ${kelvinName(k)}`}
          onChange={onKelvinChange}
        />
      )}

      {e.supportsColor && onColorChange && (
        <div className="fd-block">
          <Legend id={`${uid}-c`} value={lamp?.name}>Colour</Legend>
          <div className="fd-lt-colours" role="group" aria-labelledby={`${uid}-c`}>
            {LAMP_COLORS.map((c) => (
              <div key={c.name} className="fd-lt-level">
                <Key label={c.name} pressed={lamp?.name === c.name} wide disabled={unav} onPress={() => onColorChange(c.hs)}>
                  <Swatch lamp={c.name} />
                </Key>
                <span className="fd-lt-level-name" aria-hidden="true">{c.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {history && <Today summary={today} label="Brightness by hour today." samples={history.samples} currentHour={history.currentHour} />}

      <p className="fd-info">
        <span>{unav ? `Last seen ${e.lastSeen ?? "unknown"}` : e.lastChanged ? `Last changed ${e.lastChanged}` : ""}</span>
        <span>{e.supportsBrightness ? `Dimmable${e.supportsColorTemp ? ", warmth" : ""}${e.supportsColor ? ", colour" : ""}` : "On / off"}</span>
      </p>
    </div>
  );
}
