import { HaToggleTile } from "@dashhaus/orb";
import { HaToggleModule } from "@dashhaus/field";

export function OrbGuestMode() {
  return <HaToggleTile entityId="input_boolean.guest_mode" icon="guest" footprint="compact" />;
}

export function FieldDoNotDisturb() {
  return <HaToggleModule entityId="input_boolean.do_not_disturb" icon="bell-off" description="Silences the chimes." />;
}
