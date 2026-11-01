import { HaOwletTile } from "@dashhaus/orb";
import { HaOwletModule } from "@dashhaus/field";

export function OrbSock() {
  return <HaOwletTile entityId="sensor.owlet_sock_ac000w0123_sleep_state" name="Nova" />;
}

/** A sock whose sensors aren't named after the integration's: name its companions. */
export function FieldSock() {
  return (
    <HaOwletModule
      entityId="sensor.nova"
      heartRateEntityId="sensor.nova_bpm"
      oxygenEntityId="sensor.nova_spo2"
      chargingEntityId="binary_sensor.nova_dock"
      baseEntityId="switch.nova_base"
      alertEntityIds={{ low_oxygen: "binary_sensor.nova_spo2_low", sock_off: "binary_sensor.nova_off" }}
    />
  );
}
