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

/** The command's options, with what each does: `--help` prints them and the documentation site lists them. */
export const OPTIONS = [
  { flag: "--config <file>", text: "the config to read (default: dashboard.config.mjs in this folder)" },
  { flag: "--skip-build", text: "upload the files as they are; a skin package's file has nothing to build" },
  { flag: "--help", text: "this text" },
];

/**
 * The settings a deploy reads from `.env` (or the environment), with an example and what each is: `--help` and the
 * missing-settings error print them, and the documentation site lists them.
 */
export const SETTINGS = [
  { name: "HA_URL", example: "http://homeassistant.local:8123", text: "the address you open Home Assistant at" },
  { name: "HA_TOKEN", example: "<long-lived access token>", text: "an admin's token: Profile → Security → Long-lived access tokens" },
  { name: "HA_WWW", example: "root@homeassistant.local:/config/www", text: "Home Assistant's /config/www: user@host:/path over SSH, or a mounted folder" },
  { name: "HA_SSH_PORT", example: "22222", text: "only when SSH isn't on port 22", optional: true },
];

/** The `.env` a deploy reads, with what each setting is: `SETTINGS` as lines to copy, the optional ones commented out. */
export const ENV_HELP = (() => {
  const lines = SETTINGS.map((setting) => [`${setting.optional ? "# " : ""}${setting.name}=${setting.example}`, setting.text]);
  const width = Math.max(...lines.map(([line]) => line.length)) + 3;
  return lines.map(([line, text]) => `${line.padEnd(width)}# ${text}`).join("\n");
})();

// The starter's import lines are text the user copies, not imports of this package: written with `q` so the
// package's import-boundary check, which reads specifiers out of the source, doesn't take them for its own.
const q = '"';

/** A whole config for Orb from its package; Field's is the same with its own resource and strategy. */
export const STARTER_CONFIG = `import { resourceFile as orb } from ${q}@dashhaus/orb/resource${q};   // npm install @dashhaus/orb @dashhaus/deploy

export default {
  pageTitle: "Home",
  files: [orb],                                  // or "dist/dashhaus-my-skin.js" for a skin you build
  dashboards: [
    { path: "home-orb", title: "Home (Orb)", icon: "mdi:home-variant", strategy: { type: "custom:orb-dashboard" } },
    // A dashboard of your own: Orb's card with your cards or rows.
    // { path: "my-home", title: "My home", icon: "mdi:floor-plan", card: { type: "custom:dashhaus-orb", title: "Home", cards: ["light.kitchen"] } },
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
    : `Config: ${configFile}\n  ${problem ?? "not found"}\n\nWrite dashboard.config.mjs (or pass --config <file>). A config for Orb; Field's is the same with\n@dashhaus/field/resource and custom:field-dashboard:\n\n${indent(STARTER_CONFIG)}`;
  return `Usage: dashhaus-deploy [--config <file>] [--skip-build]

Runs the config's build if it has one (unless --skip-build), copies each file the config names to
$HA_WWW/<folder>/, registers each as /local/<folder>/<file>, a dashboard resource (versioned by its content,
so browsers fetch the new file), checks that Home Assistant serves them, and creates each dashboard the config
declares if it does not exist yet. An existing dashboard keeps its layout; only its sidebar title follows the
config. A dashboard on a skin's strategy follows the skin as it updates.

${OPTIONS.map((option) => `  ${option.flag.padEnd(15)}  ${option.text}`).join("\n")}

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
