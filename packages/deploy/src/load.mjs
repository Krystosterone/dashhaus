// The seam between the deploy CLI and the dashboards a repo declares: the user's `dashboard.config.mjs` says what
// to create, this module says what Home Assistant accepts, and it bundles the config before importing it so a repo
// may write TypeScript and import packages without Node's type stripping. The CLI imports this file, never a skin.
// The author-facing types and `generatedDashboards` are in `./config.mjs`, which imports no Node builtin.
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, extname, isAbsolute, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { build as esbuild } from "esbuild";

/** A config problem with the words the CLI prints; everything else is a bug. */
export class DeployConfigError extends Error {
  name = "DeployConfigError";
}

/** The Lovelace dashboard that holds the card: one panel view, so the card gets the full width. */
export function panelView(card, title = "Home") {
  return { views: [{ title, path: "home", type: "panel", cards: [card] }] };
}

/** The first esbuild error, with its file and line when it has one. */
function describeBuildError(error) {
  const first = error?.errors?.[0];
  if (first) {
    const where = first.location ? `${first.location.file}:${first.location.line}: ` : "";
    return `${where}${first.text}`;
  }
  return error?.message ?? String(error);
}

/** Bundle the config to a temporary ESM file; the caller imports it and removes the directory. */
async function bundleConfig(file) {
  const directory = await mkdtemp(`${tmpdir()}/dashhaus-config-`);
  const outfile = `${directory}/config.mjs`;
  try {
    await esbuild({
      absWorkingDir: dirname(file),
      bundle: true,
      conditions: ["source"],
      define: { "import.meta.url": JSON.stringify(pathToFileURL(file).href) },
      entryPoints: [file],
      format: "esm",
      logLevel: "silent",
      outfile,
      platform: "node",
      target: "node22",
    });
  } catch (error) {
    await rm(directory, { recursive: true, force: true });
    throw new DeployConfigError(`Could not load ${file}: ${describeBuildError(error)}`);
  }
  return { directory, file: outfile };
}

/** The config's default export, checked for the fields deploy reads. */
function validateConfig(config, file) {
  if (!config || typeof config !== "object" || Array.isArray(config) || !Array.isArray(config.dashboards)) {
    throw new DeployConfigError(`${file} must export default { pageTitle?, bundle, build?, dashboards: [...] }`);
  }
  if (typeof config.bundle !== "string" || !config.bundle.trim()) {
    throw new DeployConfigError(`${file}: bundle must name the file to upload`);
  }
  if (config.build !== undefined && typeof config.build !== "function") {
    throw new DeployConfigError(`${file}: build must be a function`);
  }
  return config;
}

/** Bundle, import and return the config file's default export. The file may be outside this repo. */
export async function readConfig(file) {
  const configFile = resolve(file);
  const bundled = await bundleConfig(configFile);
  try {
    const module = await import(pathToFileURL(bundled.file).href);
    return validateConfig(module.default, configFile);
  } catch (error) {
    if (error instanceof DeployConfigError) throw error;
    throw new DeployConfigError(`Could not load ${configFile}: ${error?.message ?? String(error)}`);
  } finally {
    await rm(bundled.directory, { recursive: true, force: true });
  }
}

/**
 * The dashboards a config declares, with the `.env` path and title each one names applied, held to Home Assistant's
 * rules: a path contains a hyphen, and no two dashboards share one. Throws `DeployConfigError`.
 */
export function resolveDashboards(config, env = process.env) {
  if (!Array.isArray(config?.dashboards)) throw new DeployConfigError("the deploy config must have a dashboards array");
  if (config.pageTitle !== undefined && typeof config.pageTitle !== "string") throw new DeployConfigError("pageTitle must be a string");
  const pageTitle = config.pageTitle ?? "Home";
  const dashboards = config.dashboards.map((dashboard, i) => {
    const at = `dashboards[${i}]`;
    if (!dashboard || typeof dashboard !== "object") throw new DeployConfigError(`${at} must be an object`);
    if (typeof dashboard.path !== "string") throw new DeployConfigError(`${at}.path must be a string`);
    if (typeof dashboard.title !== "string") throw new DeployConfigError(`${at}.title must be a string`);
    if (typeof dashboard.icon !== "string") throw new DeployConfigError(`${at}.icon must be a string`);
    if (typeof dashboard.card !== "function") throw new DeployConfigError(`${at}.card must be a function`);
    return {
      path: env[dashboard.env?.path] || dashboard.path,
      title: env[dashboard.env?.title] || dashboard.title,
      icon: dashboard.icon,
      card: dashboard.card,
    };
  });
  const noHyphen = dashboards.find(({ path }) => !path.includes("-"));
  if (noHyphen) throw new DeployConfigError(`dashboard paths must contain a hyphen (Home Assistant requires it): "${noHyphen.path}"`);
  const duplicatePaths = dashboards.map((dashboard) => dashboard.path).filter((path, i, paths) => paths.indexOf(path) !== i);
  if (duplicatePaths.length) throw new DeployConfigError(`dashboard paths must be unique: ${duplicatePaths.join(", ")}`);
  return { dashboards, pageTitle };
}

/**
 * The bundle a config names, resolved against the config's directory. The file's folder and name also make the
 * resource URL, so a repo keeps its URL by keeping its bundle path.
 */
export function resolveBundle(config, file) {
  if (typeof config?.bundle !== "string" || !config.bundle.trim()) {
    throw new DeployConfigError('the deploy config must name the bundle to upload: bundle: "dist/cards.js"');
  }
  const bundle = isAbsolute(config.bundle) ? config.bundle : resolve(dirname(resolve(file)), config.bundle);
  const name = basename(bundle);
  const folder = name.slice(0, name.length - extname(name).length);
  if (!name || !folder) throw new DeployConfigError(`bundle must name a file: "${config.bundle}"`);
  return { file: bundle, name, folder, resourcePath: `/local/${folder}/${name}` };
}

/** Read a config file and resolve it in one step; the CLI and the loader test share this seam. */
export async function loadDashboards({ file, env = process.env } = {}) {
  return resolveDashboards(await readConfig(file), env);
}
