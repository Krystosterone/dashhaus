/*
 * Room sensors for an automatic layout. The implementation lives in `./layout`, the pure entry a Node config can
 * import; this keeps the browser entry's `roomSensors` where it has always been.
 */

export type { RoomSensor, RoomSensorInput } from "./layout";
export { roomSensors } from "./layout";
