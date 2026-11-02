import { fmt1 } from "@dashhaus/core/entities/format";

const CARD_CODE = "sn";

export interface __Skin__SensorCardProps {
  name: string;
  area?: string;
  temperature?: number;
  humidity?: number;
  unit: "°C" | "°F";
}

/** One room reading: a name, its room, the temperature (or the humidity, for a humidity sensor) and the humidity under it. */
export function __Skin__SensorCard({ name, area, temperature, humidity, unit }: __Skin__SensorCardProps) {
  const unavailable = temperature == null && humidity == null;
  return (
    <article className="__skin__-sn-card" data-card-code={CARD_CODE} data-state={unavailable ? "unavailable" : "ready"}>
      <header className="__skin__-sn-head">
        <h3 className="__skin__-sn-name">{name}</h3>
        <p className="__skin__-sn-area">{area ?? "No area"}</p>
      </header>
      <p className="__skin__-sn-reading">
        {unavailable ? "—" : temperature != null ? `${fmt1(temperature)}${unit}` : `${Math.round(humidity!)}%`}
      </p>
      {temperature != null && humidity != null && <p className="__skin__-sn-humidity">{Math.round(humidity)}% humidity</p>}
    </article>
  );
}
