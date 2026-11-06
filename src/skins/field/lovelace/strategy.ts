import type { SkinStrategy } from "@dashhaus/core/lovelace/skin";

/**
 * `strategy: type: custom:field-dashboard` — what Home Assistant's Add dashboard lists as **Field**, under Community
 * dashboards, once Field's resource is installed (`resource.ts`). Its type is the Marketplace repository's name, so the
 * install and the dashboard read the same. The panel holds Field's card with no `cards` or `rows`: every supported
 * entity, a row per area.
 */
export const FIELD_STRATEGY: SkinStrategy = {
  type: "field-dashboard",
  name: "Field",
  description: "Hardware-style modules for every supported device, a row per room, laid out for you and kept up to date.",
  documentationURL: "https://krystosterone.github.io/dashhaus/field/",
  icon: "mdi:knob",
  // `custom:` and card.tsx's FIELD_CARD_TYPE, written out: card.tsx re-exports this module, so it can't import that one.
  card: "custom:dashhaus-field",
  options: ["viewing", "finish"],
};
