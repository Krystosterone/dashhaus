import type { ReactNode } from "react";
import type { SensorEntity, SensorHistory } from "@dashhaus/core/entities/sensor/types";
import { TREND_WORD, comfortLabel, fmtHum, fmtTemp, lowBattery, normalize, toCelsius, trendOf } from "@dashhaus/core/entities/sensor/readings";
import { lastSeenFact, updatedFact } from "@dashhaus/core/entities/facts";
import { Blank, Digits, Glyph, ModuleFrame, Pictogram, Today, Warn, useDetails, Temperature, ModuleRow, Channel } from "../../shared/ui";
import type { FieldFootprint } from "../../shared/ui";
import { DROP, IconThermo, THERMO } from "./icons";
import "./SensorModule.css";

export interface SensorModuleProps {
  entity: SensorEntity;
  footprint?: FieldFootprint;
  /** Today, on the module's meter and in the panel. Omit and the meter's hours stay dark. */
  history?: SensorHistory;
  /** Open the detail panel on first render (stories). */
  defaultOpen?: boolean;
}

/** The thermometer fills from its bulb: lit to the bulb at -10 °C, to the top at 40 °C. */
const thermoLevel = (celsius: number) => 0.4 + 0.6 * Math.min(1, Math.max(0, (celsius + 10) / 50));

/**
 * One temperature and humidity sensor as a field module: a reading, so nothing on it is pressed. Where a control
 * has its key and fader, it has its glyph on a flat plate and today's meter. The screen leads with the
 * temperature (humidity for a humidity-only sensor); the meta lines say the humidity, comfort, and whether it is
 * rising or falling. A low battery is the device's, not the reading's: it takes the area's line under the name. The name opens the panel: humidity on the screen's
 * second channel, today's temperature and humidity, the battery and when it last reported.
 */
export function SensorModule({ entity: e, footprint = "standard", history, defaultOpen = false }: SensorModuleProps) {
  const details = useDetails(defaultOpen);
  const unav = e.state === "unavailable";
  const t = unav ? undefined : e.temperature;
  const h = unav ? undefined : e.humidity;
  // The figure: the temperature, or the humidity of a sensor that only has that.
  const humidityOnly = t == null && h != null;
  const battery = lowBattery(e) ? `Battery ${e.battery}%` : undefined;
  const comfort = comfortLabel(t != null ? toCelsius(t, e.unit) : undefined, h, e.outdoor);
  const trend = history ? trendOf(history.temperature, history.currentHour) : null;
  const day = history ? normalize(history.temperature) : null;

  const pict = humidityOnly
    ? <Pictogram param="neutral" lit level={h / 100}>{DROP}</Pictogram>
    : <Pictogram param="neutral" lit={t != null} level={t == null ? 1 : thermoLevel(toCelsius(t, e.unit))}>{THERMO}</Pictogram>;
  const read: ReactNode = unav ? <Blank places={4} label="Unavailable" />
    : t != null ? <Temperature value={t} unit={e.unit} />
    : humidityOnly ? <><Digits value={h} /><small>%</small></>
    : <Blank places={4} label="No reading yet" />;

  // Most important first; the screen has room for two.
  const lines: ReactNode[] = unav
    ? ["Unavailable", e.lastSeen ? `Seen ${e.lastSeen}` : null]
    : [
      t == null && h == null ? "No reading yet" : null,
      t != null && h != null ? `${fmtHum(h)}% RH` : humidityOnly ? "Humidity" : null,
      comfort || null,
      trend ? TREND_WORD[trend] : null,
    ];
  const [first, second] = lines.filter(Boolean);
  const meta: [ReactNode, ReactNode?] | undefined = first ? [first, second] : undefined;

  const fmt = humidityOnly ? (x: number) => `${fmtHum(x)}%` : (x: number) => `${fmtTemp(x)}°`;
  const range = day && day.min != null && day.max != null ? { short: `${fmt(day.min)}–${fmt(day.max)}`, long: `Low ${fmt(day.min)} · High ${fmt(day.max)}` } : undefined;
  const what = humidityOnly ? "Humidity" : "Temperature";

  const glyph = <Glyph unavailable={unav}><IconThermo /></Glyph>;

  // The panel's content: the screen with humidity on its second channel (or, without one, the module's meta lines),
  // today's temperature and humidity, then the battery and when it last reported.
  const channel = !unav && e.temperature != null && h != null;
  const humidity = history?.humidity ? normalize(history.humidity) : null;
  const humidityRange = humidity && humidity.min != null && humidity.max != null ? `Low ${fmtHum(humidity.min)}% · High ${fmtHum(humidity.max)}%` : undefined;

  const aside = channel ? (
    <Channel pict={<Pictogram param="neutral" lit level={h / 100}>{DROP}</Pictogram>} sub="Humidity"><Digits value={h} /><small>%</small></Channel>
  ) : undefined;

  const reported = unav ? lastSeenFact(e.lastSeen) : updatedFact(e.lastUpdated);
  const power = e.battery != null && !battery ? `Battery ${e.battery}%` : "";

  return (
    <ModuleFrame
      kind="fd-sw"
      name={e.name}
      area={e.area}
      footprint={footprint}
      state={e.state}
      warning={battery}
      details={details}
      pict={pict}
      read={read}
      meta={meta}
      lead={glyph}
      row={(
        <ModuleRow className="fd-sw-row">
          {glyph}
          <Today summary={range?.short} label={`${what} by hour today.`} tone="neutral" samples={day?.samples} currentHour={history?.currentHour} />
        </ModuleRow>
      )}
      aside={aside}
      facts={{ start: battery ? <Warn>{battery}, replace soon</Warn> : unav ? "" : [comfort, trend && TREND_WORD[trend]].filter(Boolean).join(" · "), end: [power, reported].filter(Boolean).join(" · ") }}
    >
      {history && day?.samples && (
        <Today
          legend={`${what} today`}
          summary={range?.long ?? (unav ? undefined : "No readings yet")}
          label={`${what} by hour today.`}
          tone="neutral"
          samples={day?.samples}
          currentHour={history.currentHour}
        />
      )}
      {humidity && (
        <Today
          legend="Humidity today"
          summary={humidityRange ?? (unav ? undefined : "No readings yet")}
          label="Humidity by hour today."
          tone="neutral"
          samples={humidity.samples}
          currentHour={history!.currentHour}
        />
      )}
    </ModuleFrame>
  );
}

