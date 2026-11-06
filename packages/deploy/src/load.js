// The seam between the deploy CLI and the dashboards a repo declares: the user's `dashboard.config.mjs` says what
// to create, this module says what Home Assistant accepts, and it bundles the config before importing it so a repo
// may write TypeScript and import packages without Node's type stripping. The CLI imports this file, never a skin.
// The author-facing types and `generatedDashboards` are in `./config.js`, which imports no Node builtin.
import { realpathSync } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, extname, isAbsolute, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { build as esbuild } from "esbuild";

const LOADERS = { ".ts": "ts", ".tsx": "tsx", ".mts": "ts", ".cts": "ts", ".js": "js", ".jsx": "jsx", ".cjs": "js" };

/**
 * Each module bundled into the config keeps its own `import.meta.url`. A single `define` would give every dependency
 * the config file's URL, so a package that resolves a shipped file (`@dashhaus/orb/resource`) would look beside the
 * config instead of beside itself.
 */
const ownImportMetaUrl = {
  name: "dashhaus-own-import-meta-url",
  setup(build) {
    build.onLoad({ filter: /\.[cm]?[jt]sx?$/ }, async ({ path }) => {
      const source = await readFile(path, "utf8");
      if (!source.includes("import.meta.url")) return undefined;
      const url = pathToFileURL(realpathSync(path)).href;
      return {
        contents: source.replaceAll("import.meta.url", JSON.stringify(url)),
        loader: LOADERS[extname(path)] ?? "js",
        resolveDir: dirname(path),
      };
    });
  },
};

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
  const outfile = `${directory}/config.js`;
  try {
    await writeFile(`${directory}/package.json`, '{"type":"module"}\n');
    await esbuild({
      absWorkingDir: dirname(file),
      bundle: true,
      conditions: ["source"],
      entryPoints: [file],
      format: "esm",
      logLevel: "silent",
      outfile,
      platform: "node",
      plugins: [ownImportMetaUrl],
      target: "node22",
    });
  } catch (error) {
    await rm(directory, { recursive: true, force: true });
    throw new DeployConfigError(`Could not load ${file}: ${describeBuildError(error)}`);
  }
  return { directory, file: outfile };
}

/** The folder a file lands in under `$HA_WWW`: its name without the extension. */
const folderOf = (name) => name.slice(0, name.length - extname(name).length);

/**
 * The files a config names, as written. Each lands at `/local/<folder>/<name>`, so two with the same file name would
 * share a URL. Throws `DeployConfigError`.
 */
function declaredFiles(config) {
  if (config?.files === undefined) {
    throw new DeployConfigError('the deploy config must name the files to upload: files: ["dist/cards.js"]');
  }
  if (!Array.isArray(config.files)) throw new DeployConfigError('files must be a list of the files to upload: files: ["dist/cards.js"]');
  if (!config.files.length) throw new DeployConfigError("files must name at least one file to upload");
  const declared = config.files.map((path, i) => {
    if (typeof path !== "string" || !path.trim()) throw new DeployConfigError(`files[${i}] must be the path of a file to upload`);
    return { path, at: `files[${i}]` };
  });
  const names = declared.map(({ path }) => basename(path));
  const shared = names.find((name, i) => names.indexOf(name) !== i);
  if (shared) {
    const paths = declared.filter(({ path }) => basename(path) === shared).map(({ path }) => path);
    throw new DeployConfigError(`files must have different file names: ${paths.join(" and ")} would both be served as /local/${folderOf(shared)}/${shared}`);
  }
  return declared;
}

/** The config's default export, checked for the fields deploy reads. */
function validateConfig(config, file) {
  if (!config || typeof config !== "object" || Array.isArray(config) || !Array.isArray(config.dashboards)) {
    throw new DeployConfigError(`${file} must export default { pageTitle?, files, build?, dashboards: [...] }`);
  }
  try {
    declaredFiles(config);
  } catch (error) {
    if (error instanceof DeployConfigError) throw new DeployConfigError(`${file}: ${error.message}`);
    throw error;
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
    return {
      path: env[dashboard.env?.path] || dashboard.path,
      title: env[dashboard.env?.title] || dashboard.title,
      icon: dashboard.icon,
      ...layout(dashboard, at),
    };
  });
  const noHyphen = dashboards.find(({ path }) => !path.includes("-"));
  if (noHyphen) throw new DeployConfigError(`dashboard paths must contain a hyphen (Home Assistant requires it): "${noHyphen.path}"`);
  const duplicatePaths = dashboards.map((dashboard) => dashboard.path).filter((path, i, paths) => paths.indexOf(path) !== i);
  if (duplicatePaths.length) throw new DeployConfigError(`dashboard paths must be unique: ${duplicatePaths.join(", ")}`);
  return { dashboards, pageTitle };
}

const isObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const hasType = (value) => typeof value.type === "string" && Boolean(value.type.trim());

/**
 * What draws a dashboard: a `card` (a factory `card(ha)` returning `{ card, made }`, or the card's config itself),
 * saved as one panel view, or a skin's `strategy`, saved as `{ strategy }`. Exactly one of them.
 */
function layout(dashboard, at) {
  const hasCard = dashboard.card !== undefined;
  const hasStrategy = dashboard.strategy !== undefined;
  if (hasCard && hasStrategy) throw new DeployConfigError(`${at} takes a card or a strategy, not both`);
  if (hasStrategy) {
    if (!isObject(dashboard.strategy) || !hasType(dashboard.strategy)) {
      throw new DeployConfigError(`${at}.strategy must be an object with a type: strategy: { type: "custom:orb-dashboard" }`);
    }
    return { strategy: dashboard.strategy };
  }
  if (!hasCard) {
    throw new DeployConfigError(`${at} needs a card (a card(ha) function, or the card's config) or a strategy ({ type: "custom:orb-dashboard" })`);
  }
  if (typeof dashboard.card === "function") return { card: dashboard.card };
  if (!isObject(dashboard.card)) {
    throw new DeployConfigError(`${at}.card must be a card(ha) function returning { card, made }, or the card's config: { type: "custom:dashhaus-orb", ... }`);
  }
  if (!hasType(dashboard.card)) throw new DeployConfigError(`${at}.card must have a type, such as "custom:dashhaus-orb"`);
  return { card: dashboard.card };
}

/**
 * The files a config names, each resolved against the config's directory. A file's name makes its folder and its
 * resource URL, so a repo keeps a URL by keeping the file's name. Throws `DeployConfigError`.
 */
export function resolveFiles(config, file) {
  const directory = dirname(resolve(file));
  return declaredFiles(config).map(({ path, at }) => {
    const target = isAbsolute(path) ? path : resolve(directory, path);
    const name = basename(target);
    const folder = folderOf(name);
    if (!name || !folder) throw new DeployConfigError(`${at} must name a file: "${path}"`);
    return { file: target, name, folder, resourcePath: `/local/${folder}/${name}` };
  });
}

/** Read a config file and resolve it in one step; the CLI and the loader test share this seam. */
export async function loadDashboards({ file, env = process.env } = {}) {
  return resolveDashboards(await readConfig(file), env);
}
