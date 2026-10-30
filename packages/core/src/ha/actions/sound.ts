import type { SoundEntity } from "../../entities/sound/types";
import type { SoundVolumeRange } from "../mappers/sound";
import type { HaActionError, HaStore } from "../types";
import { serviceRunner } from "./run";

export interface SoundHandlers {
  onToggle: () => void;
  onVolumeChange?: (percent: number) => void;
}

export interface SoundHandlerOptions {
  onError?: (error: HaActionError) => void;
  /** The volume `number.*`'s range; without it there is no volume to set. */
  volume?: SoundVolumeRange;
}

/**
 * Create safe callback handlers for the SoundTile contract: `switch.toggle` for the sound, and
 * `number.set_value` on its volume, the percent turned back into the number's own range and step.
 * Setting the volume never switches the sound.
 */
export function createSoundHandlers(caller: Pick<HaStore, "callService">, entity: SoundEntity, options: SoundHandlerOptions = {}): SoundHandlers {
  const { run, actionable } = serviceRunner(caller, "switch", entity, options.onError);
  const { volume } = options;
  return {
    onToggle: () => {
      if (actionable()) run("toggle");
    },
    onVolumeChange: volume
      ? (percent) => {
        if (!actionable()) return;
        const number = serviceRunner(caller, "number", { entityId: volume.entityId, state: "on" }, options.onError);
        if (!Number.isFinite(percent)) {
          number.invalidInput(`${volume.entityId} volume must be finite`);
          return;
        }
        const raw = volume.min + (Math.min(100, Math.max(0, percent)) / 100) * (volume.max - volume.min);
        const stepped = volume.min + Math.round((raw - volume.min) / volume.step) * volume.step;
        // Round off the float error a fractional step leaves (0.1 * 3), within the range.
        const value = Math.min(volume.max, Math.max(volume.min, +stepped.toFixed(6)));
        number.run("set_value", { value });
      }
      : undefined,
  };
}
