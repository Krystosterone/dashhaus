// The loader is JavaScript so the CLI runs without Node's type stripping. These are its types; the author-facing
// config types live in ./config.js, which imports no Node builtin.

import type { DeployConfig, DeployDashboard } from "./config.js";

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
