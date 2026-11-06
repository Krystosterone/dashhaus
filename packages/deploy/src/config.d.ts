// The author-facing deploy config surface, in a Node-only package with no React peers. The loader and its validation
// live in ./load.js; a config imports this subpath for its types and generatedDashboards.

/** The websocket calls a config's card factory may make. The CLI passes its authenticated client. */
export interface DeployHa {
  send(type: string, payload?: Record<string, unknown>): Promise<unknown>;
}

/** What a card factory hands back: the Lovelace card's config, and what the CLI reports it created. */
export interface DeployCard {
  card: Record<string, unknown>;
  made: string;
}

/** A factory that reads the house before it returns the dashboard's card. */
export type DeployCardFactory = (ha: DeployHa) => DeployCard | Promise<DeployCard>;

/** A Lovelace card's config as written, such as `{ type: "custom:dashhaus-orb", cards: ["light.kitchen"] }`. */
export interface DeployCardConfig {
  type: string;
  [key: string]: unknown;
}

/** A dashboard strategy's config, such as `{ type: "custom:orb-dashboard" }`; the skin draws the dashboard from it. */
export interface DeployStrategy {
  type: string;
  [key: string]: unknown;
}

/** What every dashboard the CLI creates has. */
export interface DeployDashboardBase {
  /** Home Assistant requires a hyphen in a dashboard path. */
  path: string;
  title: string;
  icon: string;
  /** The `.env` keys that override this dashboard's path and sidebar title. */
  env?: { path?: string; title?: string };
}

/** A dashboard of one card in a panel view, created once and then yours to edit. */
export interface DeployCardDashboard extends DeployDashboardBase {
  /** A factory returning `{ card, made }`, or the card's config itself. */
  card: DeployCardFactory | DeployCardConfig;
  strategy?: never;
}

/** A dashboard a skin's strategy draws, saved as `{ strategy }`, so it follows the skin as it updates. */
export interface DeployStrategyDashboard extends DeployDashboardBase {
  strategy: DeployStrategy;
  card?: never;
}

/** One dashboard the CLI creates: a `card` or a `strategy`, never both. */
export type DeployDashboard = DeployCardDashboard | DeployStrategyDashboard;

/** The default export of `dashboard.config.mjs`. */
export interface DeployConfig {
  pageTitle?: string;
  /**
   * The files the CLI uploads, each relative to the config file (or absolute), with different file names: each is
   * copied to `$HA_WWW/<name>/` and registered as `/local/<name>/<file>`.
   */
  files: string[];
  /** Optional; runs once, with the config's directory as the working directory, before the files are read. */
  build?(): void | Promise<void>;
  dashboards: DeployDashboard[];
}

/** One entry in `scripts/generated-skins.js`. */
export interface GeneratedSkin {
  id: string;
  title: string;
  icon: string;
}

/** One dashboard per generated skin, in the shape a config declares its own: a card factory. */
export function generatedDashboards(
  skins: GeneratedSkin[],
  title?: string,
): (DeployCardDashboard & { card: DeployCardFactory })[];
