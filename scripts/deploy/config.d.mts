// The deploy config loader is JavaScript so `scripts/deploy.mjs` can import it without Node's type stripping. This is
// its type surface for the loader test and any TypeScript tool that reads a config.

/** The websocket calls a card factory makes; deploy's client and the tests' fake share it. */
export interface DeployHa {
  send(type: string, payload?: Record<string, unknown>): Promise<unknown>;
}

/** What a card factory hands back: the Lovelace card's config, and what deploy reports it created. */
export interface DeployCard {
  card: Record<string, unknown>;
  made: string;
}

/** One dashboard `npm run deploy` creates. */
export interface DeployDashboard {
  path: string;
  title: string;
  icon: string;
  /** The `.env` keys that override this dashboard's path and sidebar title. */
  env?: { path?: string; title?: string };
  card(ha?: DeployHa): Promise<DeployCard>;
}

/** The default export of `dashboard.config.mjs`. */
export interface DeployConfig {
  pageTitle?: string;
  dashboards: DeployDashboard[];
}

/** One entry in `scripts/generated-skins.mjs`. */
export interface GeneratedSkin {
  id: string;
  title: string;
  icon: string;
}

export class DeployConfigError extends Error {}

export function panelView(card: Record<string, unknown>, title?: string): Record<string, unknown>;

export function generatedDashboards(skins: GeneratedSkin[], title?: string): DeployDashboard[];

export function readConfig(file: string): Promise<DeployConfig>;

export function resolveDashboards(
  config: DeployConfig,
  env?: Record<string, string | undefined>,
): { dashboards: DeployDashboard[]; pageTitle: string };

export function loadDashboards(options: {
  file: string;
  env?: Record<string, string | undefined>;
}): Promise<{ dashboards: DeployDashboard[]; pageTitle: string }>;
