// The orchestrator is JavaScript so the CLI runs without Node's type stripping. These are the types its callers and
// its tests use.

import type { DeployHa } from "./config.js";

export { DeployConfigError, loadDashboards, readConfig, resolveDashboards, resolveFiles } from "./load.js";
export type { ResourceTarget } from "./load.js";
export type {
  DeployCard,
  DeployCardConfig,
  DeployCardDashboard,
  DeployCardFactory,
  DeployConfig,
  DeployDashboard,
  DeployHa,
  DeployStrategy,
  DeployStrategyDashboard,
} from "./config.js";

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
  /** The HTTP check that Home Assistant serves the uploaded file; on by default with the real `connect`. */
  fetch?: (url: string, init?: { cache?: string }) => Promise<{ ok: boolean; status: number; arrayBuffer(): Promise<ArrayBuffer> }>;
}

/** One uploaded file's resource: its URL with the content-hash version, and whether it replaced an earlier one. */
export interface DeployResource {
  name: string;
  url: string;
  version: string;
  updated: boolean;
  /** Set when Home Assistant would not manage resources (YAML mode); the resource must be added by hand. */
  error?: string;
}

export interface DeployResult {
  resources: DeployResource[];
  dashboards: { path: string; title: string; status: "created" | "existing"; renamed?: boolean }[];
}

export function deploy(options: DeployOptions): Promise<DeployResult>;

export function connectHomeAssistant(base: string, token: string): Promise<DeployClient>;
