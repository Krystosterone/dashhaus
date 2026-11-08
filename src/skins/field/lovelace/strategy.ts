import type { SkinStrategy } from "@dashhaus/core/lovelace/skin";

/**
 * `strategy: type: custom:field-dashboard` — what Home Assistant's Add dashboard lists as **Field**, under Community
 * dashboards, once Field's resource is installed (`resource.ts`). Its type is the Marketplace repository's name, so the
 * install and the dashboard read the same. The panel holds Field's card with no `cards` or `rows`: every supported
 * entity, a row per area, or one column per area with `layout: wall`.
 */
export const FIELD_STRATEGY: SkinStrategy = {
  type: "field-dashboard",
  name: "Field",
  description: "A hardware panel of keys, faders and dark screens: every supported device in a room-by-room page, laid out for you and kept up to date.",
  documentationURL: "https://krystosterone.github.io/dashhaus/field/",
  icon: "mdi:knob",
  // `custom:` and card.tsx's FIELD_CARD_TYPE, written out: card.tsx re-exports this module, so it can't import that one.
  card: "custom:dashhaus-field",
  options: ["viewing", "finish", "layout"],
};
