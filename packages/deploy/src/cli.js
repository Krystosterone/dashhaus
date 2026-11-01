// The deploy command: parse its options, read `.env` beside the config, then run the deploy. Kept separate from the
// orchestration so `--help` and argument errors print without touching Home Assistant.
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { DeployConfigError, readConfig, resolveDashboards } from "./load.js";
import { deploy } from "./deploy.js";

/** Parse `--config <file>`, `--config=<file>`, `--skip-build` and `--help`; refuse anything else. */
export function parseArgs(argv) {
  const options = { config: undefined, skipBuild: false, help: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") options.help = true;
    else if (arg === "--skip-build") options.skipBuild = true;
    else if (arg === "--config") {
      const value = argv[++i];
      if (!value) throw new DeployConfigError("--config needs a file");
      options.config = value;
    } else if (arg.startsWith("--config=")) {
      const value = arg.slice("--config=".length);
      if (!value) throw new DeployConfigError("--config needs a file");
      options.config = value;
    } else {
      throw new DeployConfigError(`Unknown option "${arg}". Run --help.`);
    }
  }
  return options;
}

/** The help text, with the dashboards the config declares (before any `.env` override). */
export function helpText(dashboards, configFile) {
  const width = Math.max(0, ...dashboards.map((dashboard) => dashboard.title.length));
  const listed = dashboards.length
    ? dashboards.map((dashboard) => `  ${dashboard.title.padEnd(width)}  /${dashboard.path}`).join("\n")
    : "  (none declared)";
  return `Usage: dashhaus-deploy [--config <file>] [--skip-build]

Builds the bundle the config names, copies it to $HA_WWW/<folder>/, registers /local/<folder>/<file>
as a dashboard resource (with a version so browsers fetch the new file), and creates the dashboards
the config declares if they do not exist yet:
${listed}

Config:   ${configFile}
Settings: .env beside the config, see .env.example.`;
}

/** Load `.env` beside the config; a shell's variables win, as before. */
function environment(configFile, env) {
  const file = join(dirname(configFile), ".env");
  if (!existsSync(file)) return env;
  try {
    process.loadEnvFile(file);
  } catch (error) {
    throw new DeployConfigError(`Could not read ${file}: ${error?.message ?? String(error)}`);
  }
  return env === process.env ? env : { ...process.env, ...env };
}

/** The command; returns the exit code so the bin and the tests share it. */
export async function main({ argv = process.argv.slice(2), cwd = process.cwd(), env = process.env, report = console.log, error = console.error, connect } = {}) {
  let options;
  try {
    options = parseArgs(argv);
  } catch (failure) {
    error(`\n✗ ${failure.message}`);
    return 1;
  }
  const configFile = resolve(cwd, options.config ?? "dashboard.config.mjs");
  try {
    if (options.help) {
      const config = await readConfig(configFile);
      report(helpText(resolveDashboards(config, {}).dashboards, configFile));
      return 0;
    }
    await deploy({ configFile, env: environment(configFile, env), skipBuild: options.skipBuild, report, connect });
    return 0;
  } catch (failure) {
    error(`\n✗ ${failure?.message ?? String(failure)}`);
    return 1;
  }
}
