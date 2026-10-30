/**
 * The dashboard-repo side of deploy: the shape a `dashboard.config.mjs` declares and the one helper a repo composes
 * its generated skins with. The executable and the loader live in `@dashhaus/deploy`; this module stays pure, so a Node
 * config can import it without reaching the browser framework or a skin.
 */

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

/** One entry in `scripts/generated-skins.mjs`. */
export interface GeneratedSkin {
  id: string;
  title: string;
  icon: string;
}

/** One dashboard per generated skin, in the shape a config declares its own. */
export function generatedDashboards(skins: GeneratedSkin[], title = "Home"): DeployDashboard[] {
  return skins.map(({ id, title: sidebar, icon }) => ({
    path: `home-dashboard-${id}`,
    title: sidebar,
    icon,
    async card() {
      return { card: { type: `custom:home-dashboard-${id}`, title }, made: `the ${id} skin's automatic layout` };
    },
  }));
}
