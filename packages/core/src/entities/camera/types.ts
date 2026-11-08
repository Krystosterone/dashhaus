/**
 * What a camera is doing, in Home Assistant's own states: `idle`, `recording` and `streaming`. A state Home Assistant
 * doesn't name is `other`, said in its own words (`stateText`), never guessed onto one of these. `unknown`,
 * `unavailable` and a missing entity are `unavailable`.
 */
export type CameraState = "idle" | "recording" | "streaming" | "other" | "unavailable";

/**
 * Mirrors one Home Assistant `camera.*` entity, a doorbell's or a nursery's camera: a reading, its state and its still,
 * with no actions and no history. The still is not normalized state: `useHaCamera` adds it from `useHaPicture`, and a
 * card draws it with `usePicture` (spec/core.md → Pictures).
 */
export interface CameraEntity {
  /** The Home Assistant entity id. */
  entityId: string;
  /** Its name: the `name` option, else Home Assistant's friendly name, else its entity id. */
  name: string;
  /** Where it is: "Porch". */
  area?: string;
  state: CameraState;
  /** An `other` state in words, as Home Assistant reports it: `motion_alert` → "Motion alert". */
  stateText?: string;
  /**
   * Its still, a URL the page can load: Home Assistant's signed `entity_picture`, resolved by the connection. None
   * while it is unavailable, so a past frame never reads as now.
   */
  picture?: string;
  /** Its maker, where the integration says (HA `brand`): "Reolink". */
  brand?: string;
  /** Its model, where the integration says (HA `model_name`): "Video Doorbell". */
  model?: string;
  /** Whether it is watching for motion (HA `motion_detection`), where it says. */
  motionDetection?: boolean;
  /** When its state last changed, formatted for the card. */
  lastChanged?: string;
  /** While unavailable, when it was last reachable. */
  lastSeen?: string;
}
