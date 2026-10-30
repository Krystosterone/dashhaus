// The command is JavaScript so the bin runs without Node's type stripping. These are its types.

import type { DeployDashboard } from "./config.mjs";
import type { DeployClient } from "./deploy.mjs";

export interface CliOptions {
  config?: string;
  skipBuild?: boolean;
  help?: boolean;
}

export function parseArgs(argv: string[]): CliOptions;

export function helpText(dashboards: DeployDashboard[], configFile: string): string;

export interface MainOptions {
  argv?: string[];
  cwd?: string;
  env?: Record<string, string | undefined>;
  report?: (message: string) => void;
  error?: (message: string) => void;
  connect?: (url: string, token: string) => Promise<DeployClient>;
}

export function main(options?: MainOptions): Promise<number>;
