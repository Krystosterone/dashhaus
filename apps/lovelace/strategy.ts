/**
 * A Lovelace dashboard strategy for a set of looks, so a Marketplace (HACS) install ends in Home Assistant's own
 * **Add dashboard** dialog: the person picks the strategy under Community dashboards and the dashboard exists. Nothing
 * is created from a card, no command is sent and nothing is saved: the frontend asks the strategy for the dashboard's
 * config each time it opens it.
 *
 * Three ship it, each a `Strategy` below: the combined bundle's `custom:dashhaus` (`DASHHAUS`, every look, listed as
 * Dashhaus), and each skin's own install, `custom:orb-dashboard` and `custom:field-dashboard` (products.ts), listed
 * under the skin's own name. A strategy is two custom elements, as the frontend looks them up
 * (`src/panels/lovelace/strategies/get-strategy.ts`):
 *
 * - `ll-strategy-dashboard-<type>`: the dashboard, one view per look, or, where it offers more than one, only the
 *   looks its `skin` names. Each view is the view strategy below.
 * - `ll-strategy-view-<type>`: one look's panel view, holding its skin's Lovelace card with no `cards` or `rows`: the
 *   automatic layout, which discovers the house's entities and lays them out by area every time it draws. A view of
 *   its own also works in any dashboard (`strategy: { type: custom:dashhaus, skin: field }` on a view).
 *
 * The layout itself stays the skins' (`autoDashboard` for orb, `autoModules`/`areaRows` for field): the views hold the
 * same `{ type: "custom:dashhaus-<skin>", title }` card the deploy config saves for Field, so every way in draws the
 * same page. The generated config depends on the strategy's config alone, never on `hass`, so it is never
 * regenerated as the house changes; the cards follow the house themselves.
 *
 * Registered in `window.customStrategies` (`src/data/lovelace_custom_strategies.ts`), which the new-dashboard dialog
 * lists from Home Assistant 2026.5. A plain module with no React, store or skin.
 */
import { STRATEGY_LOOKS } from "./dashboards";

/** The site's page for the combined bundle's install. */
export const STRATEGY_DOCS = "https://krystosterone.github.io/dashhaus/start/install/";

/** One look the strategy can draw: a view's name and path, and the Lovelace card its panel holds. */
export interface StrategyLook {
  /** The `skin:` value and the view's path: `orb`, `field`, or a generated skin's id. */
  id: string;
  /** The view's tab title. */
  name: string;
  /** The skin's Lovelace card, `custom:<tag>`. */
  type: string;
  /** The keys of the strategy's config this look's card takes, beside `title`. */
  passes: readonly PassedKey[];
}

/** Settings handed to a look's card unchanged; the card checks them, as it does in YAML. */
export type PassedKey = "viewing" | "theme" | "finish";
const PASSED_KEYS: readonly PassedKey[] = ["viewing", "theme", "finish"];

/**
 * One strategy a bundle ships: its type, what the Add dashboard dialog lists it as and suggests, and the looks it
 * draws. With more than one look its config chooses among them with `skin`; with one, it has no `skin`.
 */
export interface Strategy {
  /** The strategy's type, without the `custom:` prefix the frontend adds: `dashhaus`, `orb-dashboard`. */
  type: string;
  /** Its name in the dialog, the dialog's suggested title and the first word of its errors. */
  name: string;
  /** Its line under the name in the dialog. */
  description: string;
  /** Where the dialog's documentation link goes. */
  documentationURL: string;
  /** The dialog's suggested sidebar icon. */
  icon: string;
  /** Its looks, in tab order. */
  looks: readonly StrategyLook[];
}

/** The combined bundle's strategy, `custom:dashhaus`: every look, one tab each. */
export const DASHHAUS: Strategy = {
  type: "dashhaus",
  name: "Dashhaus",
  description: "Orb and Field: every supported device in a room-by-room page, laid out for you and kept up to date.",
  documentationURL: STRATEGY_DOCS,
  icon: "mdi:home-variant",
  looks: STRATEGY_LOOKS,
};

/** The combined strategy's type, without the `custom:` prefix the frontend adds. */
export const STRATEGY_TYPE = DASHHAUS.type;
export const dashboardTag = (strategy: Pick<Strategy, "type">) => `ll-strategy-dashboard-${strategy.type}`;
export const viewTag = (strategy: Pick<Strategy, "type">) => `ll-strategy-view-${strategy.type}`;
export const DASHBOARD_STRATEGY_TAG = dashboardTag(DASHHAUS);
export const VIEW_STRATEGY_TAG = viewTag(DASHHAUS);

/** What the strategy reads: `type` and, all optional, the looks and their cards' settings. */
export interface DashhausStrategyConfig {
  type: string;
  /** One look's id, or a list of them; every look when left out. Only on a strategy with more than one look. */
  skin?: string | string[];
  /** The page title each card prints in its header. */
  title?: string;
  /** `near` (a phone or tablet in the hand, the default) or `far` (a wall panel). Orb and Field. */
  viewing?: string;
  /** Orb's theme: `home-assistant` (the default, following its dark mode), `auto`, `light` or `dark`. */
  theme?: string;
  /** Field's finish: `home-assistant` (the default), `auto`, `alloy` or `black`. */
  finish?: string;
}

const DEFAULT_TITLE = "Home";

/** Whether a strategy's config chooses its looks with `skin`. */
const chooses = (strategy: Strategy) => strategy.looks.length > 1;

/** The keys a strategy reads: `type`, `skin` where it chooses, `title`, and what its looks' cards take. */
function keysOf(strategy: Strategy) {
  const passed = PASSED_KEYS.filter((key) => strategy.looks.some((look) => look.passes.includes(key)));
  return ["type", ...(chooses(strategy) ? ["skin"] : []), "title", ...(chooses(strategy) ? PASSED_KEYS : passed)];
}

/** The frontend's error for a config it can't use: it shows the message in place of the dashboard or view. */
function refuse(strategy: Strategy, problem: string): never {
  throw new Error(`${strategy.name}: ${problem}`);
}

function readConfig(raw: unknown, strategy: Strategy): DashhausStrategyConfig {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) refuse(strategy, "the strategy's config must be a mapping.");
  const config = raw as Record<string, unknown>;
  const keys = keysOf(strategy);
  const unknown = Object.keys(config).filter((key) => !keys.includes(key));
  if (unknown.length) refuse(strategy, `unknown ${unknown.length === 1 ? "key" : "keys"} ${unknown.map((key) => `"${key}"`).join(", ")}. The strategy takes ${keys.slice(1).join(", ")}.`);
  for (const key of ["title", ...PASSED_KEYS]) {
    if (config[key] !== undefined && typeof config[key] !== "string") refuse(strategy, `"${key}" must be text.`);
  }
  const { skin } = config;
  if (skin !== undefined && typeof skin !== "string" && !(Array.isArray(skin) && skin.every((id) => typeof id === "string"))) {
    refuse(strategy, `"skin" must be one look or a list of them: ${ids(strategy.looks)}.`);
  }
  return config as unknown as DashhausStrategyConfig;
}

const ids = (looks: readonly StrategyLook[]) => looks.map((look) => look.id).join(", ");

/** The looks a config names, in its order, or every look; an unknown or repeated id is refused. */
export function chosenLooks(config: Pick<DashhausStrategyConfig, "skin">, strategy: Strategy = DASHHAUS): StrategyLook[] {
  const { looks } = strategy;
  if (config.skin === undefined) return [...looks];
  const wanted = typeof config.skin === "string" ? [config.skin] : config.skin;
  if (!wanted.length) refuse(strategy, `"skin" lists no look. Choose from ${ids(looks)}.`);
  const seen = new Set<string>();
  return wanted.map((id) => {
    const look = looks.find((candidate) => candidate.id === id);
    if (!look) refuse(strategy, `there is no look "${id}". Choose from ${ids(looks)}.`);
    if (seen.has(id)) refuse(strategy, `"skin" lists "${id}" twice.`);
    seen.add(id);
    return look;
  });
}

/** The settings a look's card takes, from the strategy's config. */
function cardSettings(config: DashhausStrategyConfig, look: StrategyLook) {
  return Object.fromEntries(look.passes.flatMap((key) => (config[key] === undefined ? [] : [[key, config[key]]])));
}

/**
 * The dashboard: one view per chosen look, each the view strategy for that look with the settings it takes. A
 * strategy with one look names it only where it chooses: its view strategy draws its one look.
 */
export function generateDashboard(raw: unknown, strategy: Strategy = DASHHAUS) {
  const config = readConfig(raw, strategy);
  return {
    views: chosenLooks(config, strategy).map((look) => ({
      title: look.name,
      path: look.id,
      strategy: {
        type: `custom:${strategy.type}`,
        ...(chooses(strategy) && { skin: look.id }),
        ...(config.title !== undefined && { title: config.title }),
        ...cardSettings(config, look),
      },
    })),
  };
}

/**
 * One look's view: a panel, so the card gets the whole width, holding the look's card on its automatic layout. The
 * frontend keeps the view's own `title` and `path` and adds what this returns.
 */
export function generateView(raw: unknown, strategy: Strategy = DASHHAUS) {
  const config = readConfig(raw, strategy);
  if (Array.isArray(config.skin)) refuse(strategy, `a view draws one look; "skin" lists ${config.skin.length}.`);
  const [look] = chosenLooks({ skin: config.skin ?? strategy.looks[0]?.id }, strategy);
  return {
    type: "panel",
    cards: [{ type: look.type, title: config.title ?? DEFAULT_TITLE, ...cardSettings(config, look) }],
  };
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

/** A strategy's entry in the new-dashboard dialog. */
export const dialogEntry = (strategy: Strategy): CustomStrategyEntry => ({
  type: strategy.type,
  strategyType: "dashboard",
  name: strategy.name,
  description: strategy.description,
  documentationURL: strategy.documentationURL,
});

export const DASHBOARD_ENTRY: CustomStrategyEntry = dialogEntry(DASHHAUS);

/**
 * Define a strategy's two elements and list its dashboard in the new-dashboard dialog. Safe to call twice: a second
 * copy of the bundle on the page defines and lists nothing more.
 */
export function defineStrategies(strategy: Strategy = DASHHAUS) {
  class DashboardStrategy extends HTMLElement {
    /** The create dialog's defaults for the dashboard's sidebar title and icon; the person can change them. */
    static getCreateSuggestions() {
      return { title: strategy.name, icon: strategy.icon };
    }

    static async generate(config: unknown) {
      return generateDashboard(config, strategy);
    }

    /** The config alone decides the views; the cards follow the house. */
    static shouldRegenerate() {
      return false;
    }
  }

  class ViewStrategy extends HTMLElement {
    static async generate(config: unknown) {
      return generateView(config, strategy);
    }

    static shouldRegenerate() {
      return false;
    }
  }

  if (!customElements.get(dashboardTag(strategy))) customElements.define(dashboardTag(strategy), DashboardStrategy);
  if (!customElements.get(viewTag(strategy))) customElements.define(viewTag(strategy), ViewStrategy);
  window.customStrategies ??= [];
  if (!window.customStrategies.some((entry) => entry.type === strategy.type && entry.strategyType === "dashboard")) {
    window.customStrategies.push(dialogEntry(strategy));
  }
}
