import { useHaOwlet } from "@dashhaus/core";

/**
 * A sock's readings and alerts. The heart rate, oxygen, charging and alert sensors are found beside the sleep state
 * sensor; `live` turns false once no reading has changed for a while, so old figures aren't read as current.
 */
export function Vitals() {
  const { entity } = useHaOwlet("sensor.owlet_sock_ac000w0123_sleep_state", { name: "Nova" });
  if (entity.charging) return <p>{entity.name}'s sock is charging.</p>;
  return (
    <div>
      <p>
        {entity.name}: {entity.state.replace("_", " ")}
        {entity.heartRate != null && `, ${entity.heartRate} bpm`}
        {entity.oxygen != null && `, ${entity.oxygen}% O₂`}
        {entity.live === false && " (readings stopped)"}
      </p>
      {entity.alerts?.length ? <p role="alert">{entity.alerts.join(", ").replaceAll("_", " ")}</p> : null}
    </div>
  );
}
