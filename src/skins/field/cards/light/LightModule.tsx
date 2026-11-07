import { useId } from "react";
import type { ReactNode } from "react";
import type { LightEntity, LightHistory } from "@dashhaus/core/entities/light/types";
import { kelvinName, K_MIN, K_MAX } from "@dashhaus/core/entities/light/kelvin";
import { LAMP_COLORS, lampColorOf } from "@dashhaus/core/entities/light/color";
import { QUICK_LEVELS, lightAbilities, lightWord } from "@dashhaus/core/entities/light/words";
import type { Hs } from "@dashhaus/core/entities/light/color";
import { NO_READING_YET, lastChangedFact, lastSeenFact, sinceFact } from "@dashhaus/core/entities/facts";
import { todaySummary } from "@dashhaus/core/entities/today";
import { ModuleFrame, Key, Digits, Blank, Fader, Option, Pictogram, Swatch, Today, useDetails, KeyGroup, ModuleRow, Channel } from "../../shared/ui";
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
  // Reachable but not reported yet: it switches and dims like an unlit light, and its screen has no reading.
  const unknown = e.state === "unknown";
  const dimmable = e.supportsBrightness;
  // An absent reading leaves the fader without a thumb and the screen on its plain state word; the hidden level only
  // says where the keyboard starts.
  const pct = e.brightness == null ? 100 : Math.min(100, Math.max(1, Math.round(e.brightness)));
  const known = dimmable && e.brightness != null;
  const word = lightWord(e);

  const read = unav ? <Blank label="Unavailable" />
    : unknown ? <Blank label="Unknown" />
    : !on ? "OFF"
    : known ? <><Digits value={pct} /><small>%</small></>
    : "ON";
  // The warmth in the model's words, as orb's status line names it; a narrow module's screen shortens it to the
  // kelvin figure (LightModule.css), where the name would clip. The panel's channel keeps its figure in kelvin.
  const warmth = on && e.supportsColorTemp && e.kelvin != null
    ? <><span className="fd-lt-wn">{kelvinName(e.kelvin)}</span><span className="fd-lt-wk">{Math.round(e.kelvin / 100) * 100}K</span></>
    : on && e.supportsColor && e.hs ? lampColorOf(e.hs).name
    : null;
  const since = unav ? (e.lastSeen ? lastSeenFact(e.lastSeen) : null) : sinceFact(e.lastChanged) ?? null;
  const meta: [ReactNode, string?] | undefined = unav ? ["Unavailable", since ?? undefined]
    : unknown ? ["Unknown", since ?? undefined]
    : warmth ? [warmth, since ?? undefined] : since ? [since] : undefined;

  // The bulb's base always lights while on, so a lamp at 3% still reads lit; the rest fills with brightness.
  const pict = <Pictogram level={known ? 0.25 + 0.75 * (pct / 100) : 1} lit={on}>{BULB}</Pictogram>;
  const openPanel = details.openDetails;
  // The power key and the brightness fader, the same in the module and the panel. Unavailable, the brightness isn't
  // known, so the fader goes and the key spans the row, as every field control's does.
  const faded = dimmable && !unav;
  const controls = (where: "m" | "p") => (
    <ModuleRow className="fd-lt-row" solo={!faded}>
      <Key label={e.name} pressed={on} unavailable={unav} onPress={onToggle} onHold={openPanel} wide={!faded} caption={!dimmable && !unav ? word : undefined}>
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
          empty={!known}
          valueText={!known ? word : on ? `${pct} percent` : `${word}. Last set to ${pct} percent`}
          onChange={onBrightnessChange}
        />
      )}
    </ModuleRow>
  );

  // The panel's second channel: the colour it shows now (only while on, since Home Assistant reports none while off or
  // on a colour temperature), else its warmth. Unavailable, the screen keeps the module's meta lines.
  const min = e.minKelvin ?? K_MIN;
  const max = Math.max(e.maxKelvin ?? K_MAX, min + 100);
  const k = e.kelvin == null ? null : Math.min(max, Math.max(min, Math.round(e.kelvin / 100) * 100));
  const lamp = on && e.supportsColor && e.hs ? lampColorOf(e.hs) : null;
  const aside = unav ? undefined : lamp ? (
    <Channel pict={<Pictogram lit lamp={lamp.name}>{LENS}</Pictogram>} name={lamp.name} sub="Colour" />
  ) : e.supportsColorTemp ? (
    <Channel pict={<Pictogram lit={on && k != null} param="b">{SUN}</Pictogram>} sub={k != null ? kelvinName(k) : "Warmth"}>
      {k != null ? <>{k}<small>K</small></> : <Blank places={4} label={NO_READING_YET} />}
    </Channel>
  ) : undefined;
  const today = history && (unav ? "Unavailable" : todaySummary("on", history.onMinutes));

  // The panel: the screen and the controls again, quick levels, warmth, colours, today, and facts.
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
      controls={controls}
      aside={aside}
      facts={{ start: unav ? lastSeenFact(e.lastSeen) : lastChangedFact(e.lastChanged), end: lightAbilities(e) }}
    >

      {e.supportsBrightness && (
        <KeyGroup legend="Quick levels" columns={4}>
          {QUICK_LEVELS.map((l) => (
            <Option key={l.value} name={l.label}>
              <Key label={`${l.label}, ${l.sub}`} wide disabled={unav} onPress={() => onBrightnessChange(l.value)}>
                <span className="fd-key-fig">{l.value}</span>
              </Key>
            </Option>
          ))}
        </KeyGroup>
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
          valueText={k == null ? NO_READING_YET : `${k} kelvin, ${kelvinName(k)}`}
          onChange={onKelvinChange}
        />
      )}

      {e.supportsColor && onColorChange && (
        <KeyGroup legend="Colour" value={lamp?.name} columns={7} narrow={4} narrowAt={420} className="fd-lt-colours">
          {LAMP_COLORS.map((c) => (
            <Option key={c.name} name={c.name}>
              <Key label={c.name} pressed={lamp?.name === c.name} wide disabled={unav} onPress={() => onColorChange(c.hs)}>
                <Swatch lamp={c.name} />
              </Key>
            </Option>
          ))}
        </KeyGroup>
      )}

      {history && <Today summary={today} label="Brightness by hour today." samples={history.samples} currentHour={history.currentHour} />}
    </ModuleFrame>
  );
}
