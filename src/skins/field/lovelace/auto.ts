import { deviceCompanion, friendlyName, groupByArea, numericSensors, roomSensors, safetySensors, sortByName, visibleEntities } from "@dashhaus/core/lovelace/layout";
import type { AutoInput } from "@dashhaus/core/lovelace/layout";
import { kindOf } from "./config";
import type { FieldRow, ModuleConfig } from "./config";

export type { AutoInput } from "@dashhaus/core/lovelace/layout";
export { areaName, groupByArea } from "@dashhaus/core/lovelace/layout";

/**
 * Every supported entity Field can draw, for a card without `cards` or `rows`, as the card its entity id picks: hidden and
 * config or diagnostic entities left out, sorted by name. The sensor card takes only room air: one per device, its
 * humidity and battery as companions (`roomSensors`). The weather card takes the first weather entity by name, as
 * orb's does, with `sun.sun` for night. Every input_boolean and switch is a toggle, every humidifier a humidifier, every
 * fan a fan, every cover a cover, every media_player a media player, every vacuum a vacuum, every alarm_control_panel an alarm, every lock a lock with its device's battery (`deviceCompanion`), every `sensor.*_sleep_state` an Owlet sock (its readings are
 * found beside it, so they aren't drawn on their own), and every `sensor.*_voucher` a guest Wi-Fi code (its QR code and
 * buttons likewise), and every calendar a calendar. The binary sensor card takes only the safety glance, as orb's does: every door, window, leak and
 * smoke sensor (`safetySensors`), with its device's battery. Every camera is a camera, its still on a standard module.
 * The numeric card takes the room's air quality, one reading per
 * device (`numericSensors`: CO₂ first); power, energy and any other reading are added by hand. The dashboard groups them by area.
 */
export function autoModules(input: AutoInput): ModuleConfig[] {
  const { states } = input;
  const visible = visibleEntities(input, (entity) => kindOf(entity) !== undefined);
  const cards = sortByName(visible.flatMap((entity): ModuleConfig[] => {
    const kind = kindOf(entity);
    if (kind !== "lock") return kind ? [{ entity, kind }] : [];
    const battery = deviceCompanion(input, entity, "battery");
    return [{ entity, kind, ...(battery && { battery }) }];
  }), (module) => friendlyName(states, module.entity));
  const others = cards.filter((module) => module.kind !== "sensor" && module.kind !== "weather" && module.kind !== "binarySensor");
  const weather = cards.find((module) => module.kind === "weather");
  const sensors = roomSensors(input).map((room): ModuleConfig => ({ ...room, kind: "sensor" }));
  const safety = safetySensors(input).map((sensor): ModuleConfig => ({ ...sensor, kind: "binarySensor" }));
  const air = numericSensors(input).map((entity): ModuleConfig => ({ entity, kind: "numeric" }));
  return sortByName([...others, ...(weather ? [{ ...weather, sun: "sun.sun" }] : []), ...sensors, ...safety, ...air], (module) => friendlyName(states, module.entity));
}

/** The automatic layout's rows: one per area, titled with its name (`groupByArea`), modules by name. */
export const areaRows = (modules: readonly ModuleConfig[]): FieldRow[] =>
  groupByArea(modules).map((group) => ({ title: group.area, flow: "normal", align: "top", cards: group.modules.map((item) => ({ item, width: 1 })) }));
