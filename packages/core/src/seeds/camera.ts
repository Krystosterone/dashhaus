import type { CameraEntity } from "../entities/camera/types";
import { PICTURE_BROKEN, PICTURE_DOORSTEP, PICTURE_NURSERY, PICTURE_TALL, PICTURE_WIDE } from "./pictures";

/**
 * Example cameras for stories, every skin's: a still is a local picture from `./pictures` straight on the model, so a
 * story never fetches the network. A camera has no history.
 */
export interface CameraSeed { entity: CameraEntity }

export const CAMERA_SEEDS = {
  /** A doorbell, idle, by day: a parcel on the mat. */
  idle: {
    entity: { entityId: "camera.front_door", name: "Front door", area: "Porch", state: "idle", picture: PICTURE_DOORSTEP, brand: "Reolink", model: "Video Doorbell", motionDetection: true, lastChanged: "08:16" },
  },
  /** A nursery camera recording through the night, in infrared greys. */
  recording: {
    entity: { entityId: "camera.nursery", name: "Nursery", area: "Nursery", state: "recording", picture: PICTURE_NURSERY, brand: "Nanit", model: "Pro", lastChanged: "19:30" },
  },
  /** Someone is watching its stream: a wide driveway camera. */
  streaming: {
    entity: { entityId: "camera.driveway", name: "Driveway", area: "Outside", state: "streaming", picture: PICTURE_WIDE, lastChanged: "11:02" },
  },
  /** A state Home Assistant doesn't name, from its integration: said in its own words. */
  other: {
    entity: { entityId: "camera.back_door", name: "Back door", area: "Garden", state: "other", stateText: "Motion alert", picture: PICTURE_DOORSTEP, brand: "Reolink", model: "Video Doorbell", motionDetection: true, lastChanged: "21:04" },
  },
  /** Reachable, but Home Assistant has given no still yet. */
  noStill: {
    entity: { entityId: "camera.garden", name: "Garden", area: "Outside", state: "idle", lastChanged: "10:40" },
  },
  /** Its still fails to load, with no frame to keep. */
  failed: {
    entity: { entityId: "camera.side_gate", name: "Side gate", area: "Outside", state: "idle", picture: PICTURE_BROKEN, lastChanged: "09:12" },
  },
  /** A portrait doorbell, 9:16: cropped to a band in a 16:9 box, shown whole in the details. */
  tall: {
    entity: { entityId: "camera.doorbell", name: "Doorbell", area: "Porch", state: "idle", picture: PICTURE_TALL, brand: "Ring", model: "Video Doorbell 4", motionDetection: false, lastChanged: "16:05" },
  },
  unavailable: {
    entity: { entityId: "camera.garage", name: "Garage", area: "Garage", state: "unavailable", lastSeen: "08:20" },
  },
  /** Worst case: a name and an area long enough to truncate at every width, a wide still, a state of its own. */
  long: {
    entity: {
      entityId: "camera.back_garden_by_the_shed", name: "Back garden by the shed and the vegetable beds", area: "Garden, behind the garage and the greenhouse",
      state: "other", stateText: "Motion alert", picture: PICTURE_WIDE, brand: "Ubiquiti", model: "UniFi Protect G4 Bullet", motionDetection: true, lastChanged: "Fri 18:30",
    },
  },
} satisfies Record<string, CameraSeed>;

export type CameraSeedName = keyof typeof CAMERA_SEEDS;

/**
 * Worst-case data: no still yet, a still that fails to load, a very wide and a very tall still, a long name and an own
 * state, unavailable. The card's Worst case story and Orb → Foundations → Worst case both draw these.
 */
export const CAMERA_WORST_CASE: CameraSeed[] = [CAMERA_SEEDS.noStill, CAMERA_SEEDS.failed, CAMERA_SEEDS.streaming, CAMERA_SEEDS.tall, CAMERA_SEEDS.long, CAMERA_SEEDS.unavailable];
