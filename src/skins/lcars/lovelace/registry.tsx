import type { ReactNode } from "react";
import type { LcarsFootprint } from "../shared/ui";
import { HaLcarsLightCard } from "../ha/HaLcarsLightCard";
import { HaLcarsSensorCard } from "../ha/HaLcarsSensorCard";
// new-card: registry imports

/** Common YAML facts every generated Card receives. Domain-specific options stay in its Connected adapter. */
export interface LcarsCardItem {
  entity: string;
  kind: string;
  name?: string;
  area?: string;
  footprint?: LcarsFootprint;
  span?: number;
  history?: boolean;
  /** A room sensor's companions on its device, found by the automatic layout. */
  humidity?: string;
  battery?: string;
}

export interface LcarsCardRegistration {
  domains: readonly string[];
  /** Picks this Card before its domain's default, without an explicit `card:`. */
  id?: RegExp;
  render: (item: LcarsCardItem, footprint: LcarsFootprint) => ReactNode;
}

/** The skin's one card seam: the card generator adds an import and one registration here for each domain. */
export const LCARS_CARDS = {
  light: { domains: ["light"], render: (item, footprint) => <HaLcarsLightCard entityId={item.entity} name={item.name} area={item.area} loadHistory={item.history} footprint={footprint} /> },
  sensor: { domains: ["sensor"], render: (item, footprint) => <HaLcarsSensorCard entityId={item.entity} humidityEntityId={item.humidity} batteryEntityId={item.battery} name={item.name} area={item.area} loadHistory={item.history} footprint={footprint} /> },
  // new-card: registry entries
} satisfies Record<string, LcarsCardRegistration>;

export type LcarsCardKind = keyof typeof LCARS_CARDS;
const registry = LCARS_CARDS as Record<string, LcarsCardRegistration>;
export const lcarsCardKinds = () => Object.keys(registry) as LcarsCardKind[];
export const lcarsCardKindsFor = (entity: string) => {
  const domain = entity.slice(0, entity.indexOf("."));
  return lcarsCardKinds().filter((kind) => registry[kind].domains.includes(domain));
};
export const lcarsKindOf = (entity: string): LcarsCardKind | undefined => {
  const kinds = lcarsCardKindsFor(entity);
  return kinds.find((kind) => registry[kind].id?.test(entity)) ?? kinds.find((kind) => !registry[kind].id);
};
export const renderLcarsCard = (item: LcarsCardItem, footprint: LcarsFootprint): ReactNode => registry[item.kind]?.render(item, item.footprint ?? footprint);
