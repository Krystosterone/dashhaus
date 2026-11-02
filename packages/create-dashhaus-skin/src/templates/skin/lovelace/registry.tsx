import type { ReactNode } from "react";
import type { __Skin__Footprint } from "../shared/ui";
// new-card: registry imports

/** Common YAML facts every generated Card receives. Domain-specific options stay in its Connected adapter. */
export interface __Skin__CardItem {
  entity: string;
  kind: string;
  name?: string;
  area?: string;
  footprint?: __Skin__Footprint;
  span?: number;
  history?: boolean;
}

export interface __Skin__CardRegistration {
  domains: readonly string[];
  /** Picks this Card before its domain's default, without an explicit `card:`. */
  id?: RegExp;
  render: (item: __Skin__CardItem, footprint: __Skin__Footprint) => ReactNode;
}

/** The skin's one card seam: the card generator adds an import and one registration here for each domain. */
export const __SKIN_CONST___CARDS = {
  // new-card: registry entries
} satisfies Record<string, __Skin__CardRegistration>;

export type __Skin__CardKind = keyof typeof __SKIN_CONST___CARDS;
const registry = __SKIN_CONST___CARDS as Record<string, __Skin__CardRegistration>;
export const __skinVar__CardKinds = () => Object.keys(registry) as __Skin__CardKind[];
export const __skinVar__CardKindsFor = (entity: string) => {
  const domain = entity.slice(0, entity.indexOf("."));
  return __skinVar__CardKinds().filter((kind) => registry[kind].domains.includes(domain));
};
export const __skinVar__KindOf = (entity: string): __Skin__CardKind | undefined => {
  const kinds = __skinVar__CardKindsFor(entity);
  return kinds.find((kind) => registry[kind].id?.test(entity)) ?? kinds.find((kind) => !registry[kind].id);
};
export const render__Skin__Card = (item: __Skin__CardItem, footprint: __Skin__Footprint): ReactNode => registry[item.kind]?.render(item, item.footprint ?? footprint);
