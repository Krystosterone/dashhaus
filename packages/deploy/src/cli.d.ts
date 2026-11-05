// The command is JavaScript so the bin runs without Node's type stripping. These are its types.

import type { DeployDashboard } from "./config.js";
import type { DeployClient, DeployOptions } from "./deploy.js";

export interface CliOptions {
  config?: string;
  skipBuild?: boolean;
  help?: boolean;
}

export function parseArgs(argv: string[]): CliOptions;

export function helpText(dashboards: DeployDashboard[] | undefined, configFile: string, problem?: string): string;

export interface CliOption {
  flag: string;
  text: string;
}

export interface CliSetting {
  name: string;
  example: string;
  text: string;
  optional?: boolean;
}

export const OPTIONS: CliOption[];
export const SETTINGS: CliSetting[];
export const ENV_HELP: string;
export const STARTER_CONFIG: string;

export interface MainOptions {
  argv?: string[];
  cwd?: string;
  env?: Record<string, string | undefined>;
  report?: (message: string) => void;
  error?: (message: string) => void;
  connect?: (url: string, token: string) => Promise<DeployClient>;
  fetch?: DeployOptions["fetch"];
}

export function main(options?: MainOptions): Promise<number>;
