import { useHaDyson } from "@dashhaus/core";
import { AIR_BAND_WORD, POLLUTANT_WORDS, airText, dysonAir, dysonWarning } from "@dashhaus/core/entities/dyson/air";

/** On and off, its speed or Auto, and the air it cleans in Dyson's own bands. */
export function Air({ entityId }: { entityId: string }) {
  const { entity, actions } = useHaDyson(entityId);
  const air = dysonAir(entity);
  const warning = dysonWarning(entity);
  return (
    <fieldset disabled={entity.state === "unavailable"}>
      <legend>{entity.name}: {entity.auto ? "Auto" : entity.state === "on" ? `${entity.percentage ?? "—"}%` : entity.state}</legend>
      <button type="button" aria-pressed={entity.state === "on"} onClick={actions.onToggle}>
        {entity.state === "on" ? "On" : "Off"}
      </button>
      <button type="button" aria-pressed={entity.auto === true} onClick={() => actions.onAutoChange(!entity.auto)}>Auto</button>
      {warning ? <p role="status">{warning.said}</p> : air && <p>Air {AIR_BAND_WORD[air.band].toLowerCase()}</p>}
      <dl>
        {entity.air.map((reading) => (
          <div key={reading.pollutant}>
            <dt>{POLLUTANT_WORDS[reading.pollutant].label}</dt>
            <dd>{airText(reading)}</dd>
          </div>
        ))}
      </dl>
    </fieldset>
  );
}
