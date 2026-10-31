import { fmt1 } from "@dashhaus/core/entities/format";

const CARD_CODE = "sn";

export interface __Skin__SensorCardProps {
  name: string;
  area?: string;
  temperature?: number;
  humidity?: number;
  unit: "°C" | "°F";
}

/** One room reading: a name, its room, the temperature and, when the device has one, the humidity. */
export function __Skin__SensorCard({ name, area, temperature, humidity, unit }: __Skin__SensorCardProps) {
  const unavailable = temperature == null && humidity == null;
  return (
    <article className="__skin__-sn-card" data-card-code={CARD_CODE} data-state={unavailable ? "unavailable" : "ready"}>
      <header className="__skin__-sn-head">
        <h3 className="__skin__-sn-name">{name}</h3>
        <p className="__skin__-sn-area">{area ?? "No area"}</p>
      </header>
      <p className="__skin__-sn-reading">
        {unavailable ? "—" : temperature == null ? "No reading" : `${fmt1(temperature)}${unit}`}
      </p>
      {humidity != null && !unavailable && <p className="__skin__-sn-humidity">{fmt1(humidity)}% humidity</p>}
    </article>
  );
}
