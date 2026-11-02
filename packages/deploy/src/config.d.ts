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

/** One dashboard the CLI creates. */
export interface DeployDashboard {
  /** Home Assistant requires a hyphen in a dashboard path. */
  path: string;
  title: string;
  icon: string;
  /** The `.env` keys that override this dashboard's path and sidebar title. */
  env?: { path?: string; title?: string };
  card(ha: DeployHa): DeployCard | Promise<DeployCard>;
}

/** The default export of `dashboard.config.mjs`. */
export interface DeployConfig {
  pageTitle?: string;
  /** The file the CLI uploads, relative to the config file (or absolute). */
  bundle: string;
  /** Optional; runs with the config's directory as the working directory, before the bundle is read. */
  build?(): void | Promise<void>;
  dashboards: DeployDashboard[];
}

/** One entry in `scripts/generated-skins.js`. */
export interface GeneratedSkin {
  id: string;
  title: string;
  icon: string;
}

/** One dashboard per generated skin, in the shape a config declares its own. */
export function generatedDashboards(skins: GeneratedSkin[], title?: string): DeployDashboard[];
