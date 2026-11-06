/**
 * `strategy: type: custom:dashhaus` — the combined Marketplace install's dashboard strategy, kept working in its last
 * release (spec/release.md → The combined install's sunset). Orb and Field now install on their own, each with its own
 * strategy (`defineSkinStrategy` in `@dashhaus/core/lovelace/skin`); this one says so, above each view and in the Add
 * dashboard dialog, and otherwise draws what it always drew. The person picks **Dashhaus** under Community dashboards
 * and the dashboard exists. Nothing is created from a card, no command is sent and nothing is saved: the frontend asks the
 * strategy for the dashboard's config each time it opens it.
 *
 * Two custom elements, as the frontend looks them up (`src/panels/lovelace/strategies/get-strategy.ts`):
 *
 * - `ll-strategy-dashboard-dashhaus`: the dashboard, one view per look (Orb, then Field), or only the looks its `skin`
 *   names. Each view is the view strategy below.
 * - `ll-strategy-view-dashhaus`: one look's panel view: the notice that the look now installs on its own, above its
 *   skin's Lovelace card with no `cards` or `rows`, the automatic layout, which discovers the house's entities and lays
 *   them out by area every time it draws. A view of its own also works in any dashboard
 *   (`strategy: { type: custom:dashhaus, skin: field }` on a view).
 *
 * The layout itself stays the skins' (`autoDashboard` for orb, `autoModules`/`areaRows` for field): the views hold the
 * same `{ type: "custom:dashhaus-<skin>", title }` card the deploy config saves for Field, so both ways in draw the same
 * page. The generated config depends on the strategy's config alone, never on `hass`, so it is never
 * regenerated as the house changes; the cards follow the house themselves.
 *
 * Registered in `window.customStrategies` (`src/data/lovelace_custom_strategies.ts`), which the new-dashboard dialog
 * lists from Home Assistant 2026.5. A plain module with no React, store or skin.
 */
import { STRATEGY_LOOKS } from "./dashboards";

/** The strategy's type, without the `custom:` prefix the frontend adds. */
export const STRATEGY_TYPE = "dashhaus";
export const DASHBOARD_STRATEGY_TAG = `ll-strategy-dashboard-${STRATEGY_TYPE}`;
export const VIEW_STRATEGY_TAG = `ll-strategy-view-${STRATEGY_TYPE}`;
export const STRATEGY_DOCS = "https://krystosterone.github.io/dashhaus/start/install/";

/** Each look's own page, where its own install starts. */
const LOOK_PAGES: Record<string, string> = {
  orb: "https://krystosterone.github.io/dashhaus/orb/",
  field: "https://krystosterone.github.io/dashhaus/field/",
};

/**
 * What every view says above its look: Orb and Field install on their own now, and how to move. A Markdown card, Home
 * Assistant's own, so it needs nothing from the skin and reads the same in either.
 */
export function sunsetNotice(look: Pick<StrategyLook, "id" | "name">) {
  const page = LOOK_PAGES[look.id] ?? STRATEGY_DOCS;
  return {
    type: "markdown",
    content: [
      `**${look.name} now installs on its own.** This combined Dashhaus install gets no more updates.`,
      `Install [${look.name}](${page}) from the Marketplace, add its dashboard under **Settings → Dashboards → Add dashboard**, then remove Dashhaus. [How to move](${STRATEGY_DOCS})`,
    ].join(" "),
  };
}

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

/** What the strategy reads: `type` and, all optional, the looks and their cards' settings. */
export interface DashhausStrategyConfig {
  type: string;
  /** One look's id, or a list of them; every look when left out. */
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

const KEYS = ["type", "skin", "title", ...PASSED_KEYS];
const DEFAULT_TITLE = "Home";

/** The frontend's error for a config it can't use: it shows the message in place of the dashboard or view. */
function refuse(problem: string): never {
  throw new Error(`Dashhaus: ${problem}`);
}

function readConfig(raw: unknown): DashhausStrategyConfig {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) refuse("the strategy's config must be a mapping.");
  const config = raw as Record<string, unknown>;
  const unknown = Object.keys(config).filter((key) => !KEYS.includes(key));
  if (unknown.length) refuse(`unknown ${unknown.length === 1 ? "key" : "keys"} ${unknown.map((key) => `"${key}"`).join(", ")}. The strategy takes ${KEYS.slice(1).join(", ")}.`);
  for (const key of ["title", ...PASSED_KEYS]) {
    if (config[key] !== undefined && typeof config[key] !== "string") refuse(`"${key}" must be text.`);
  }
  const { skin } = config;
  if (skin !== undefined && typeof skin !== "string" && !(Array.isArray(skin) && skin.every((id) => typeof id === "string"))) {
    refuse(`"skin" must be one look or a list of them: ${ids(STRATEGY_LOOKS)}.`);
  }
  return config as unknown as DashhausStrategyConfig;
}

const ids = (looks: readonly StrategyLook[]) => looks.map((look) => look.id).join(", ");

/** The looks a config names, in its order, or every look; an unknown or repeated id is refused. */
export function chosenLooks(config: Pick<DashhausStrategyConfig, "skin">, looks: readonly StrategyLook[] = STRATEGY_LOOKS): StrategyLook[] {
  if (config.skin === undefined) return [...looks];
  const wanted = typeof config.skin === "string" ? [config.skin] : config.skin;
  if (!wanted.length) refuse(`"skin" lists no look. Choose from ${ids(looks)}.`);
  const seen = new Set<string>();
  return wanted.map((id) => {
    const look = looks.find((candidate) => candidate.id === id);
    if (!look) refuse(`there is no look "${id}". Choose from ${ids(looks)}.`);
    if (seen.has(id)) refuse(`"skin" lists "${id}" twice.`);
    seen.add(id);
    return look;
  });
}

/** The settings a look's card takes, from the strategy's config. */
function cardSettings(config: DashhausStrategyConfig, look: StrategyLook) {
  return Object.fromEntries(look.passes.flatMap((key) => (config[key] === undefined ? [] : [[key, config[key]]])));
}

/** The dashboard: one view per chosen look, each the view strategy for that look with the settings it takes. */
export function generateDashboard(raw: unknown, looks: readonly StrategyLook[] = STRATEGY_LOOKS) {
  const config = readConfig(raw);
  return {
    views: chosenLooks(config, looks).map((look) => ({
      title: look.name,
      path: look.id,
      strategy: {
        type: `custom:${STRATEGY_TYPE}`,
        skin: look.id,
        ...(config.title !== undefined && { title: config.title }),
        ...cardSettings(config, look),
      },
    })),
  };
}

/**
 * One look's view: a panel, so the stack gets the whole width, holding the notice above the look's card on its
 * automatic layout. The frontend keeps the view's own `title` and `path` and adds what this returns.
 */
export function generateView(raw: unknown, looks: readonly StrategyLook[] = STRATEGY_LOOKS) {
  const config = readConfig(raw);
  if (Array.isArray(config.skin)) refuse(`a view draws one look; "skin" lists ${config.skin.length}.`);
  const [look] = chosenLooks({ skin: config.skin ?? looks[0]?.id }, looks);
  return {
    type: "panel",
    cards: [{ type: "vertical-stack", cards: [sunsetNotice(look), { type: look.type, title: config.title ?? DEFAULT_TITLE, ...cardSettings(config, look) }] }],
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

export const DASHBOARD_ENTRY: CustomStrategyEntry = {
  type: STRATEGY_TYPE,
  strategyType: "dashboard",
  name: "Dashhaus",
  description: "Orb and Field now install on their own from the Marketplace: install one and pick it here instead. This combined dashboard still works, with no more updates.",
  documentationURL: STRATEGY_DOCS,
};

/**
 * Define both strategy elements and list the dashboard strategy in the new-dashboard dialog. Safe to call twice: a
 * second copy of the bundle on the page defines and lists nothing more.
 */
export function defineStrategies(looks: readonly StrategyLook[] = STRATEGY_LOOKS) {
  class DashhausDashboardStrategy extends HTMLElement {
    /** The create dialog's defaults for the dashboard's sidebar title and icon; the person can change them. */
    static getCreateSuggestions() {
      return { title: "Dashhaus", icon: "mdi:home-variant" };
    }

    static async generate(config: unknown) {
      return generateDashboard(config, looks);
    }

    /** The config alone decides the views; the cards follow the house. */
    static shouldRegenerate() {
      return false;
    }
  }

  class DashhausViewStrategy extends HTMLElement {
    static async generate(config: unknown) {
      return generateView(config, looks);
    }

    static shouldRegenerate() {
      return false;
    }
  }

  if (!customElements.get(DASHBOARD_STRATEGY_TAG)) customElements.define(DASHBOARD_STRATEGY_TAG, DashhausDashboardStrategy);
  if (!customElements.get(VIEW_STRATEGY_TAG)) customElements.define(VIEW_STRATEGY_TAG, DashhausViewStrategy);
  window.customStrategies ??= [];
  if (!window.customStrategies.some((entry) => entry.type === STRATEGY_TYPE && entry.strategyType === "dashboard")) {
    window.customStrategies.push({ ...DASHBOARD_ENTRY });
  }
}
