import type { ReactNode } from "react";
import type { FuturaFootprint } from "../shared/ui";
import { HaFuturaLightCard } from "../ha/HaFuturaLightCard";
import { HaFuturaClimateCard } from "../ha/HaFuturaClimateCard";
import { HaFuturaToggleCard } from "../ha/HaFuturaToggleCard";
import { HaFuturaSensorCard } from "../ha/HaFuturaSensorCard";
import { HaFuturaWeatherCard } from "../ha/HaFuturaWeatherCard";
// new-card: registry imports

/** Common YAML facts every generated Card receives. Domain-specific options stay in its Connected adapter. */
export interface FuturaCardItem {
  entity: string;
  kind: string;
  name?: string;
  area?: string;
  footprint?: FuturaFootprint;
  span?: number;
  history?: boolean;
}

export interface FuturaCardRegistration {
  domains: readonly string[];
  /** Picks this Card before its domain's default, without an explicit `card:`. */
  id?: RegExp;
  render: (item: FuturaCardItem, footprint: FuturaFootprint) => ReactNode;
}

/** The generated skin's one Card seam. `new-card --skin futura` adds imports and one registration here. */
export const FUTURA_CARDS = {
  light: { domains: ["light"], render: (item, footprint) => <HaFuturaLightCard entityId={item.entity} name={item.name} area={item.area} loadHistory={item.history} footprint={footprint} /> },
  climate: { domains: ["climate"], render: (item, footprint) => <HaFuturaClimateCard entityId={item.entity} name={item.name} area={item.area} loadHistory={item.history} footprint={footprint} /> },
  toggle: { domains: ["input_boolean", "switch"], render: (item, footprint) => <HaFuturaToggleCard entityId={item.entity} name={item.name} area={item.area} loadHistory={item.history} footprint={footprint} /> },
  sensor: { domains: ["sensor"], render: (item, footprint) => <HaFuturaSensorCard entityId={item.entity} name={item.name} area={item.area} loadHistory={item.history} footprint={footprint} /> },
  weather: { domains: ["weather"], render: (item, footprint) => <HaFuturaWeatherCard entityId={item.entity} name={item.name} loadHistory={item.history} footprint={footprint} /> },
  // new-card: registry entries
} satisfies Record<string, FuturaCardRegistration>;

export type FuturaCardKind = keyof typeof FUTURA_CARDS;
const registry = FUTURA_CARDS as Record<string, FuturaCardRegistration>;
export const futuraCardKinds = () => Object.keys(registry) as FuturaCardKind[];
export const futuraCardKindsFor = (entity: string) => {
  const domain = entity.slice(0, entity.indexOf("."));
  return futuraCardKinds().filter((kind) => registry[kind].domains.includes(domain));
};
export const futuraKindOf = (entity: string): FuturaCardKind | undefined => {
  const kinds = futuraCardKindsFor(entity);
  return kinds.find((kind) => registry[kind].id?.test(entity)) ?? kinds.find((kind) => !registry[kind].id);
};
export const renderFuturaCard = (item: FuturaCardItem, footprint: FuturaFootprint): ReactNode => registry[item.kind]?.render(item, item.footprint ?? footprint);
