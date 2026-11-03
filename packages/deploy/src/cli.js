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

/** The `.env` a deploy reads, with what each setting is. Printed by `--help` and by the missing-settings error. */
export const ENV_HELP = `HA_URL=http://homeassistant.local:8123   # the address you open Home Assistant at
HA_TOKEN=<long-lived access token>        # an admin's token: Profile → Security → Long-lived access tokens
HA_WWW=root@homeassistant.local:/config/www   # Home Assistant's /config/www: user@host:/path over SSH, or a mounted folder
# HA_SSH_PORT=22222                       # only when SSH isn't on port 22`;

// The starter's import lines are text the user copies, not imports of this package: written with `q` so the
// package's import-boundary check, which reads specifiers out of the source, doesn't take them for its own.
const q = '"';

/** A whole config for the prebuilt bundle; a skin project names its own built file in `bundle` instead. */
export const STARTER_CONFIG = `import { fileURLToPath } from ${q}node:url${q};
import { bundlePath } from ${q}@dashhaus/bundle${q};   // npm install @dashhaus/bundle: Orb and Field, prebuilt

export default {
  pageTitle: "Home",
  bundle: fileURLToPath(bundlePath),             // or "dist/dashhaus-my-skin.js" for a skin you build
  // build: async () => { /* run your build */ },// optional; --skip-build skips it
  dashboards: [
    {
      path: "home-orb",                          // the URL path; Home Assistant requires a hyphen
      title: "Home (Orb)",                       // the sidebar title
      icon: "mdi:home-variant",
      async card() {
        // A card with no cards or rows lays out every supported entity by area.
        return { card: { type: "custom:dashhaus-orb" }, made: "automatic" };
      },
    },
  ],
};`;

/**
 * The help text. With a config it lists the dashboards that config declares (before any `.env` override); without
 * one it says so and prints a config to start from, so `--help` is useful before anything exists.
 */
export function helpText(dashboards, configFile, problem) {
  const width = Math.max(0, ...(dashboards ?? []).map((dashboard) => dashboard.title.length));
  const listed = dashboards
    ? dashboards.length
      ? dashboards.map((dashboard) => `  ${dashboard.title.padEnd(width)}  /${dashboard.path}`).join("\n")
      : "  (none declared)"
    : undefined;
  const config = listed
    ? `Config: ${configFile}\nIt declares these dashboards:\n${listed}`
    : `Config: ${configFile}\n  ${problem ?? "not found"}\n\nWrite dashboard.config.mjs (or pass --config <file>). For the prebuilt Orb and Field bundle:\n\n${indent(STARTER_CONFIG)}`;
  return `Usage: dashhaus-deploy [--config <file>] [--skip-build]

Builds the bundle the config names (unless --skip-build), copies it to $HA_WWW/<folder>/, registers
/local/<folder>/<file> as a dashboard resource (versioned by its content, so browsers fetch the new file),
checks that Home Assistant serves it, and creates each dashboard the config declares if it does not exist
yet. An existing dashboard keeps its layout; only its sidebar title follows the config.

  --config <file>  the config to read (default: dashboard.config.mjs in this folder)
  --skip-build     upload the bundle as it is; use it for @dashhaus/bundle, which has nothing to build
  --help           this text

${config}

Settings: .env beside the config (or the environment), never the config:

${indent(ENV_HELP)}

After a deploy, reload any Home Assistant tab that was already open.`;
}

const indent = (text) => text.split("\n").map((line) => `    ${line}`).join("\n");

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
export async function main({ argv = process.argv.slice(2), cwd = process.cwd(), env = process.env, report = console.log, error = console.error, connect, fetch } = {}) {
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
      if (!existsSync(configFile)) {
        report(helpText(undefined, configFile));
        return 0;
      }
      try {
        report(helpText(resolveDashboards(await readConfig(configFile), {}).dashboards, configFile));
      } catch (failure) {
        report(helpText(undefined, configFile, failure?.message ?? String(failure)));
      }
      return 0;
    }
    if (!existsSync(configFile)) {
      throw new DeployConfigError(`No config at ${configFile}.\nWrite dashboard.config.mjs there, or pass --config <file>. Run dashhaus-deploy --help for a config to start from.`);
    }
    await deploy({ configFile, env: environment(configFile, env), skipBuild: options.skipBuild, report, connect, fetch });
    return 0;
  } catch (failure) {
    error(`\n✗ ${failure?.message ?? String(failure)}`);
    return 1;
  }
}
