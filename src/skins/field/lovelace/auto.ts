import { deviceCompanion, friendlyName, groupByArea, roomSensors, sortByName, visibleEntities } from "@dashhaus/dashboard/layout";
import type { AutoInput } from "@dashhaus/dashboard/layout";
import { kindOf } from "./config";
import type { ModuleConfig, SectionConfig } from "./config";

export type { AutoInput } from "@dashhaus/dashboard/layout";
export { areaName, groupByArea } from "@dashhaus/dashboard/layout";

/**
 * Every supported entity Field can draw, for a card without `modules`, as the card its entity id picks: hidden and
 * config or diagnostic entities left out, sorted by name. The sensor card takes only room air: one per device, its
 * humidity and battery as companions (`roomSensors`). The weather card takes the first weather entity by name, as
 * orb's does, with `sun.sun` for night. Every input_boolean and switch is a toggle, every humidifier a humidifier, every
 * fan a fan, every cover a cover, every alarm_control_panel an alarm, every lock a lock with its device's battery (`deviceCompanion`), and every `sensor.*_sleep_state` an Owlet sock (its readings are
 * found beside it, so they aren't drawn on their own). The dashboard groups them by area.
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
  const others = cards.filter((module) => module.kind !== "sensor" && module.kind !== "weather");
  const weather = cards.find((module) => module.kind === "weather");
  const sensors = roomSensors(input).map((room): ModuleConfig => ({ ...room, kind: "sensor" }));
  return sortByName([...others, ...(weather ? [{ ...weather, sun: "sun.sun" }] : []), ...sensors], (module) => friendlyName(states, module.entity));
}

/** The automatic layout's sections, and a `modules` list's: one per area, titled with its name (`groupByArea`). */
export const areaSections = (modules: readonly ModuleConfig[]): SectionConfig[] =>
  groupByArea(modules).map((group) => ({ kind: "section", title: group.area, modules: group.modules }));
