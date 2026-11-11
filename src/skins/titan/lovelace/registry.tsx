import type { ReactNode } from "react";
import type { CardKindSpec } from "@dashhaus/core/lovelace/schema";
import type { TitanFootprint } from "../shared/ui";
import { HaTitanLightCard } from "../ha/HaTitanLightCard";
import { HaTitanSensorCard } from "../ha/HaTitanSensorCard";
import { HaTitanClimateCard } from "../ha/HaTitanClimateCard";
import { HaTitanLockCard } from "../ha/HaTitanLockCard";
import { HaTitanToggleCard } from "../ha/HaTitanToggleCard";
import { HaTitanWeatherCard } from "../ha/HaTitanWeatherCard";
// new-card: registry imports

/** Common YAML facts every generated Card receives. Domain-specific options stay in its Connected adapter. */
export interface TitanCardItem {
  entity: string;
  kind: string;
  name?: string;
  area?: string;
  footprint?: TitanFootprint;
  history?: boolean;
  /** The companion entities its hook composes, by YAML key: a sensor's `humidity` and `battery`. */
  companions?: Readonly<Record<string, string>>;
}

/** `domains`, and `id` to pick this Card before its domain's default without an explicit `card:`. */
export interface TitanCardRegistration extends CardKindSpec {
  render: (item: TitanCardItem, footprint: TitanFootprint) => ReactNode;
}

/** A Card's companion entities as YAML keys (`humidity: sensor.bedroom_humidity`), read into `item.companions`. */
export const titanCompanions = (keys: readonly string[]): Pick<CardKindSpec, "keys" | "readOptions"> => ({
  keys,
  readOptions: (read, raw, at) => {
    const companions = Object.fromEntries(keys.flatMap((key) => {
      const id = raw[key] == null ? undefined : read.entityId(raw[key], `${at}.${key}`);
      return id ? [[key, id]] : [];
    }));
    return Object.keys(companions).length ? { companions } : {};
  },
});

/** The skin's one card seam: the card generator adds an import and one registration here for each domain. */
export const TITAN_CARDS = {
  light: { domains: ["light"], render: (item, footprint) => <HaTitanLightCard entityId={item.entity} name={item.name} area={item.area} loadHistory={item.history} footprint={footprint} /> },
  sensor: { domains: ["sensor"], ...titanCompanions(["humidity", "battery"]), render: (item, footprint) => <HaTitanSensorCard entityId={item.entity} name={item.name} area={item.area} loadHistory={item.history} humidityEntityId={item.companions?.humidity} batteryEntityId={item.companions?.battery} footprint={footprint} /> },
  climate: { domains: ["climate"], render: (item, footprint) => <HaTitanClimateCard entityId={item.entity} name={item.name} area={item.area} loadHistory={item.history} footprint={footprint} /> },
  lock: { domains: ["lock"], ...titanCompanions(["battery"]), render: (item, footprint) => <HaTitanLockCard entityId={item.entity} name={item.name} area={item.area} batteryEntityId={item.companions?.battery} footprint={footprint} /> },
  toggle: { domains: ["input_boolean", "switch"], render: (item, footprint) => <HaTitanToggleCard entityId={item.entity} name={item.name} area={item.area} loadHistory={item.history} footprint={footprint} /> },
  weather: { domains: ["weather"], ...titanCompanions(["aqi", "sun"]), render: (item, footprint) => <HaTitanWeatherCard entityId={item.entity} name={item.name} loadHistory={item.history} aqiEntityId={item.companions?.aqi} sunEntityId={item.companions?.sun} footprint={footprint} /> },
  // new-card: registry entries
} satisfies Record<string, TitanCardRegistration>;

export type TitanCardKind = keyof typeof TITAN_CARDS;
const registry = TITAN_CARDS as Record<string, TitanCardRegistration>;
export const titanCardKinds = () => Object.keys(registry) as TitanCardKind[];
export const titanCardKindsFor = (entity: string) => {
  const domain = entity.slice(0, entity.indexOf("."));
  return titanCardKinds().filter((kind) => registry[kind].domains.includes(domain));
};
export const titanKindOf = (entity: string): TitanCardKind | undefined => {
  const kinds = titanCardKindsFor(entity);
  return kinds.find((kind) => registry[kind].id?.test(entity)) ?? kinds.find((kind) => !registry[kind].id);
};
export const renderTitanCard = (item: TitanCardItem, footprint: TitanFootprint): ReactNode => registry[item.kind]?.render(item, item.footprint ?? footprint);
