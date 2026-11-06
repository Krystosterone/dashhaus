/**
 * A skin's dashboard strategy: what lets Home Assistant's own **Settings → Dashboards → Add dashboard** list the skin
 * under its own name, under Community dashboards, and make its dashboard with no YAML, token or command. Every skin's
 * resource defines one beside its Lovelace card (`defineSkinStrategy`), Orb's and Field's and an author's from
 * `create-dashhaus-skin` alike. The frontend asks the strategy for the dashboard's config each time it opens it, so a
 * dashboard stores nothing but `{ strategy: { type: "custom:<type>" } }` and follows the skin as it updates.
 *
 * Two custom elements, as the frontend looks them up (`src/panels/lovelace/strategies/get-strategy.ts`):
 *
 * - `ll-strategy-dashboard-<type>`: the dashboard, one panel view holding the skin's Lovelace card with no `cards` or
 *   `rows`, which lays the house out by area every time it draws.
 * - `ll-strategy-view-<type>`: the same panel as one view, for a dashboard of the person's own.
 *
 * The generated config depends on the strategy's config alone, never on `hass`, so it is never regenerated as the house
 * changes; the card follows the house itself. Registered in `window.customStrategies`
 * (`src/data/lovelace_custom_strategies.ts`), which the new-dashboard dialog lists from Home Assistant 2026.5. Plain
 * DOM, no React and no store.
 */

/** A skin's strategy: its type, how the Add dashboard dialog lists it, and the card it draws. */
export interface SkinStrategy {
  /** The strategy's type without the `custom:` prefix the frontend adds: `orb-dashboard`, `dashhaus-my-skin`. */
  type: string;
  /** The skin's name: the dialog's entry, the suggested sidebar title and the first word of its errors. */
  name: string;
  /** The line under the name in the dialog. */
  description: string;
  /** Where the dialog's documentation link goes: the skin's own page. */
  documentationURL?: string;
  /** The dialog's suggested sidebar icon. */
  icon?: string;
  /** The skin's Lovelace card, `custom:<tag>`. */
  card: string;
  /** Keys of the strategy's config handed to the card unchanged, beside `title`; the card checks them as in YAML. */
  options?: readonly string[];
}

/** The page title the card prints in its header when the strategy's config names none. */
const DEFAULT_TITLE = "Home";
const DEFAULT_ICON = "mdi:view-dashboard-outline";

export const dashboardStrategyTag = (strategy: Pick<SkinStrategy, "type">) => `ll-strategy-dashboard-${strategy.type}`;
export const viewStrategyTag = (strategy: Pick<SkinStrategy, "type">) => `ll-strategy-view-${strategy.type}`;

/** The frontend's error for a config it can't use: it shows the message in place of the dashboard or view. */
function refuse(strategy: SkinStrategy, problem: string): never {
  throw new Error(`${strategy.name}: ${problem}`);
}

/** The keys a strategy's config may carry. */
const keysOf = (strategy: SkinStrategy) => ["type", "title", ...(strategy.options ?? [])];

function readConfig(strategy: SkinStrategy, raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) refuse(strategy, "the strategy's config must be a mapping.");
  const config = raw as Record<string, unknown>;
  const keys = keysOf(strategy);
  const unknown = Object.keys(config).filter((key) => !keys.includes(key));
  if (unknown.length) {
    refuse(strategy, `unknown ${unknown.length === 1 ? "key" : "keys"} ${unknown.map((key) => `"${key}"`).join(", ")}. The strategy takes ${keys.slice(1).join(", ")}.`);
  }
  for (const key of keys.slice(1)) {
    if (config[key] !== undefined && typeof config[key] !== "string") refuse(strategy, `"${key}" must be text.`);
  }
  return config;
}

/** The skin's card as the panel holds it: its title and the options the config gives. */
function cardOf(strategy: SkinStrategy, config: Record<string, unknown>) {
  const options = Object.fromEntries((strategy.options ?? []).flatMap((key) => (config[key] === undefined ? [] : [[key, config[key]]])));
  return { type: strategy.card, title: (config.title as string | undefined) ?? DEFAULT_TITLE, ...options };
}

/** One view: a panel, so the card gets the whole width. The frontend keeps a view's own `title` and `path`. */
export function generateSkinView(strategy: SkinStrategy, raw: unknown) {
  return { type: "panel", cards: [cardOf(strategy, readConfig(strategy, raw))] };
}

/** The dashboard: one panel view, titled with the skin's name. */
export function generateSkinDashboard(strategy: SkinStrategy, raw: unknown) {
  return { views: [{ title: strategy.name, path: "home", ...generateSkinView(strategy, raw) }] };
}

/** The frontend's entry for a strategy in the new-dashboard dialog (`CustomStrategyEntry`). */
export interface CustomStrategyEntry {
  type: string;
  strategyType: "dashboard" | "view" | "section";
  name?: string;
  description?: string;
  documentationURL?: string;
}

declare global {
  interface Window {
    customStrategies?: CustomStrategyEntry[];
  }
}

/** The dialog's entry for a skin's dashboard strategy. */
export const strategyEntry = (strategy: SkinStrategy): CustomStrategyEntry => ({
  type: strategy.type,
  strategyType: "dashboard",
  name: strategy.name,
  description: strategy.description,
  ...(strategy.documentationURL && { documentationURL: strategy.documentationURL }),
});

/**
 * Define the skin's two strategy elements and list its dashboard strategy in the new-dashboard dialog. Safe to call
 * twice: a second copy of the resource on the page defines and lists nothing more.
 */
export function defineSkinStrategy(strategy: SkinStrategy) {
  class SkinDashboardStrategy extends HTMLElement {
    /** The create dialog's defaults for the dashboard's sidebar title and icon; the person can change them. */
    static getCreateSuggestions() {
      return { title: strategy.name, icon: strategy.icon ?? DEFAULT_ICON };
    }

    static async generate(config: unknown) {
      return generateSkinDashboard(strategy, config);
    }

    /** The config alone decides the view; the card follows the house. */
    static shouldRegenerate() {
      return false;
    }
  }

  class SkinViewStrategy extends HTMLElement {
    static async generate(config: unknown) {
      return generateSkinView(strategy, config);
    }

    static shouldRegenerate() {
      return false;
    }
  }

  if (!customElements.get(dashboardStrategyTag(strategy))) customElements.define(dashboardStrategyTag(strategy), SkinDashboardStrategy);
  if (!customElements.get(viewStrategyTag(strategy))) customElements.define(viewStrategyTag(strategy), SkinViewStrategy);
  window.customStrategies ??= [];
  if (!window.customStrategies.some((entry) => entry.type === strategy.type && entry.strategyType === "dashboard")) {
    window.customStrategies.push(strategyEntry(strategy));
  }
}
