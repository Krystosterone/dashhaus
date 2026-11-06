import type { SkinStrategy } from "@dashhaus/core/lovelace/skin";

/**
 * `strategy: type: custom:dashhaus-__skin__` — what Home Assistant's Add dashboard lists as **__Section__**, under
 * Community dashboards, once its resource is loaded (`resource.ts`): one panel holding the skin's card with no `cards`
 * or `rows`, every entity it can draw, a row per area.
 */
export const __SKIN_CONST___STRATEGY: SkinStrategy = {
  type: "dashhaus-__skin__",
  name: "__Section__",
  description: "Every entity __Section__ can draw, a row per area, laid out for you.",
  card: "custom:dashhaus-__skin__",
};
