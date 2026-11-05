import type { ReactNode } from "react";
import type { CardKindSpec } from "@dashhaus/dashboard/schema";
import type { GlasshouseFootprint } from "../shared/ui";
import { HaGlasshouseLightCard } from "../ha/HaGlasshouseLightCard";
import { HaGlasshouseSensorCard } from "../ha/HaGlasshouseSensorCard";
import { HaGlasshouseWeatherCard } from "../ha/HaGlasshouseWeatherCard";
import { HaGlasshouseClimateCard } from "../ha/HaGlasshouseClimateCard";
import { HaGlasshouseLockCard } from "../ha/HaGlasshouseLockCard";
import { HaGlasshouseToggleCard } from "../ha/HaGlasshouseToggleCard";
// new-card: registry imports

/** Common YAML facts every generated Card receives. Domain-specific options stay in its Connected adapter. */
export interface GlasshouseCardItem {
  entity: string;
  kind: string;
  name?: string;
  area?: string;
  footprint?: GlasshouseFootprint;
  history?: boolean;
  /** The companion entities its hook composes, by YAML key: a sensor's `humidity` and `battery`. */
  companions?: Readonly<Record<string, string>>;
}

/** `domains`, and `id` to pick this Card before its domain's default without an explicit `card:`. */
export interface GlasshouseCardRegistration extends CardKindSpec {
  render: (item: GlasshouseCardItem, footprint: GlasshouseFootprint) => ReactNode;
}

/** A Card's companion entities as YAML keys (`humidity: sensor.bedroom_humidity`), read into `item.companions`. */
export const glasshouseCompanions = (keys: readonly string[]): Pick<CardKindSpec, "keys" | "options"> => ({
  keys,
  options: (read, raw, at) => {
    const companions = Object.fromEntries(keys.flatMap((key) => {
      const id = raw[key] == null ? undefined : read.entityId(raw[key], `${at}.${key}`);
      return id ? [[key, id]] : [];
    }));
    return Object.keys(companions).length ? { companions } : {};
  },
});

/** The skin's one card seam: the card generator adds an import and one registration here for each domain. */
export const GLASSHOUSE_CARDS = {
  light: { domains: ["light"], render: (item, footprint) => <HaGlasshouseLightCard entityId={item.entity} name={item.name} area={item.area} loadHistory={item.history} footprint={footprint} /> },
  sensor: { domains: ["sensor"], ...glasshouseCompanions(["humidity", "battery"]), render: (item, footprint) => <HaGlasshouseSensorCard entityId={item.entity} name={item.name} area={item.area} loadHistory={item.history} humidityEntityId={item.companions?.humidity} batteryEntityId={item.companions?.battery} footprint={footprint} /> },
  weather: { domains: ["weather"], ...glasshouseCompanions(["aqi", "sun"]), render: (item, footprint) => <HaGlasshouseWeatherCard entityId={item.entity} name={item.name} loadHistory={item.history} aqiEntityId={item.companions?.aqi} sunEntityId={item.companions?.sun} footprint={footprint} /> },
  climate: { domains: ["climate"], render: (item, footprint) => <HaGlasshouseClimateCard entityId={item.entity} name={item.name} area={item.area} loadHistory={item.history} footprint={footprint} /> },
  lock: { domains: ["lock"], ...glasshouseCompanions(["battery"]), render: (item, footprint) => <HaGlasshouseLockCard entityId={item.entity} name={item.name} area={item.area} batteryEntityId={item.companions?.battery} footprint={footprint} /> },
  toggle: { domains: ["input_boolean", "switch"], render: (item, footprint) => <HaGlasshouseToggleCard entityId={item.entity} name={item.name} area={item.area} loadHistory={item.history} footprint={footprint} /> },
  // new-card: registry entries
} satisfies Record<string, GlasshouseCardRegistration>;

export type GlasshouseCardKind = keyof typeof GLASSHOUSE_CARDS;
const registry = GLASSHOUSE_CARDS as Record<string, GlasshouseCardRegistration>;
export const glasshouseCardKinds = () => Object.keys(registry) as GlasshouseCardKind[];
export const glasshouseCardKindsFor = (entity: string) => {
  const domain = entity.slice(0, entity.indexOf("."));
  return glasshouseCardKinds().filter((kind) => registry[kind].domains.includes(domain));
};
export const glasshouseKindOf = (entity: string): GlasshouseCardKind | undefined => {
  const kinds = glasshouseCardKindsFor(entity);
  return kinds.find((kind) => registry[kind].id?.test(entity)) ?? kinds.find((kind) => !registry[kind].id);
};
export const renderGlasshouseCard = (item: GlasshouseCardItem, footprint: GlasshouseFootprint): ReactNode => registry[item.kind]?.render(item, item.footprint ?? footprint);
