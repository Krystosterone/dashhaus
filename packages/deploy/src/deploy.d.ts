// The orchestrator is JavaScript so the CLI runs without Node's type stripping. These are the types its callers and
// its tests use.

import type { DeployHa } from "./config.js";

export { DeployConfigError, loadDashboards, readConfig, resolveBundle, resolveDashboards } from "./load.js";
export type { DeployCard, DeployConfig, DeployDashboard, DeployHa } from "./config.js";

/** The authenticated Home Assistant client the CLI hands a config's card factory. */
export interface DeployClient extends DeployHa {
  readonly version: string;
  close(): void;
}

export interface DeployOptions {
  configFile: string;
  env?: Record<string, string | undefined>;
  skipBuild?: boolean;
  report?: (message: string) => void;
  warn?: (message: string) => void;
  connect?: (url: string, token: string) => Promise<DeployClient>;
}

export interface DeployResult {
  version: string;
  resource: { url: string; updated: boolean; error?: string };
  dashboards: { path: string; title: string; status: "created" | "existing"; renamed?: boolean }[];
}

export function deploy(options: DeployOptions): Promise<DeployResult>;

export function connectHomeAssistant(base: string, token: string): Promise<DeployClient>;
