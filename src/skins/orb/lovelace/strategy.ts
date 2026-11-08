import type { SkinStrategy } from "@dashhaus/core/lovelace/skin";

/**
 * `strategy: type: custom:orb-dashboard` — what Home Assistant's Add dashboard lists as **Orb**, under Community
 * dashboards, once Orb's resource is installed (`resource.ts`). Its type is the Marketplace repository's name, so the
 * install and the dashboard read the same. The panel holds Orb's card with no `cards` or `rows`: the automatic layout,
 * one column per place with `layout: wall`.
 */
export const ORB_STRATEGY: SkinStrategy = {
  type: "orb-dashboard",
  name: "Orb",
  description: "Soft, round cards read at a glance: every supported device in a room-by-room page, laid out for you and kept up to date.",
  documentationURL: "https://krystosterone.github.io/dashhaus/orb/",
  icon: "mdi:home-variant",
  // `custom:` and card.tsx's CARD_TYPE, written out: card.tsx re-exports this module, so it can't import that one.
  card: "custom:dashhaus-orb",
  options: ["viewing", "theme", "layout"],
};
