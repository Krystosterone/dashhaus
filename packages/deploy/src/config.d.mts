// The loader is JavaScript so the CLI runs without Node's type stripping. These are its types; the author-facing
// config types live in @scope/dashboard/cli, and deploy keeps its own copy so it imports no browser package.

/** The websocket calls a config's card factory may make. */
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
  path: string;
  title: string;
  icon: string;
  env?: { path?: string; title?: string };
  card(ha: DeployHa): DeployCard | Promise<DeployCard>;
}

/** The default export of `dashboard.config.mjs`. */
export interface DeployConfig {
  pageTitle?: string;
  bundle: string;
  build?(): void | Promise<void>;
  dashboards: DeployDashboard[];
}

/** Where the bundle goes and the resource URL that serves it. */
export interface BundleTarget {
  file: string;
  name: string;
  folder: string;
  resourcePath: string;
}

export class DeployConfigError extends Error {}

export function panelView(card: Record<string, unknown>, title?: string): Record<string, unknown>;

export function readConfig(file: string): Promise<DeployConfig>;

export function resolveDashboards(
  config: DeployConfig,
  env?: Record<string, string | undefined>,
): { dashboards: DeployDashboard[]; pageTitle: string };

export function resolveBundle(config: DeployConfig, file: string): BundleTarget;

export function loadDashboards(options: {
  file: string;
  env?: Record<string, string | undefined>;
}): Promise<{ dashboards: DeployDashboard[]; pageTitle: string }>;
