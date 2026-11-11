import { isRoomReading, useHaSelector } from "../index";

/*
 * Which card a `sensor.*` listed on its own draws (spec/deploy.md → The format): one a Lovelace card's YAML lists with
 * no `card:`, no id pattern and none of the sensor card's own keys, so the reader left the choice to the card as it
 * draws (`ReadCard.defaulted`, `@dashhaus/core/lovelace/schema`). The rule reads only what the entity declares, never
 * its value, so a reading that goes unavailable keeps its card; a skin with no numeric card ignores it.
 */

/** The device classes that declare a sensor's state is not a number: Home Assistant's text-valued sensors. */
const TEXT_CLASSES: readonly string[] = ["enum", "timestamp", "date"];

const declared = (value: unknown) => typeof value === "string" && value.trim().length > 0;

/**
 * The card a `sensor.*` listed on its own draws, from one raw state's attributes:
 *
 * 1. no state, or no attributes (a missing entity, a typo): `sensor`, the domain's own, which says Unavailable;
 * 2. a room reading (`isRoomReading`: a temperature or humidity class, or no class with °C, °F or %): `sensor`;
 * 3. a sensor that declares a number (a `state_class`, a `unit_of_measurement`, or any `device_class` other than
 *    `enum`, `timestamp` or `date`): `numeric`, worded by its device class and unit;
 * 4. anything else (a text sensor): `sensor`, as before.
 */
export function sensorCard(state: { attributes?: Record<string, unknown> } | undefined): "sensor" | "numeric" {
  const attributes = state?.attributes;
  if (!attributes || typeof attributes !== "object" || Array.isArray(attributes)) return "sensor";
  if (isRoomReading(attributes)) return "sensor";
  const cls = attributes.device_class;
  const number = declared(attributes.state_class)
    || declared(attributes.unit_of_measurement)
    || (declared(cls) && !TEXT_CLASSES.includes(cls as string));
  return number ? "numeric" : "sensor";
}

/**
 * The card a `sensor.*` listed on its own draws, from the store (`sensorCard`). It re-renders only when the answer
 * changes; until the entity arrives, the room sensor, which draws it Unavailable at the same height.
 */
export function useSensorCard(entityId: string): "sensor" | "numeric" {
  return useHaSelector((snapshot) => sensorCard(snapshot.entities[entityId]));
}
