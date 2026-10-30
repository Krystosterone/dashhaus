// The seam between `npm run deploy` and the dashboards it creates: the user's `dashboard.config.mjs` says what to
// create, this module says what Home Assistant accepts. Deploy imports this file, never a skin; the repo's config is
// the only place that reaches orb's generated layout.
import { pathToFileURL } from "node:url";

/** A config problem with the words deploy prints; everything else is a bug. */
export class DeployConfigError extends Error {
  name = "DeployConfigError";
}

/** The Lovelace dashboard that holds the card: one panel view, so the card gets the full width. */
export function panelView(card, title = "Home") {
  return { views: [{ title, path: "home", type: "panel", cards: [card] }] };
}

/** One dashboard per generated skin, in the shape a config declares its own. */
export function generatedDashboards(skins, title = "Home") {
  return skins.map(({ id, title: sidebar, icon }) => ({
    path: `home-dashboard-${id}`,
    title: sidebar,
    icon,
    async card() {
      return { card: { type: `custom:home-dashboard-${id}`, title }, made: `the ${id} skin's automatic layout` };
    },
  }));
}

/** Import the config file and return its default export. */
export async function readConfig(file) {
  let module;
  try {
    module = await import(pathToFileURL(file).href);
  } catch (error) {
    throw new DeployConfigError(`Could not load ${file}: ${error.message}`);
  }
  const config = module.default;
  if (!config || !Array.isArray(config.dashboards)) {
    throw new DeployConfigError(`${file} must export default { pageTitle?, dashboards: [...] }`);
  }
  return config;
}

/**
 * The dashboards a config declares, with the `.env` path and title each one names applied, held to Home
 * Assistant's rules: a path contains a hyphen, and no two dashboards share one. Throws `DeployConfigError`.
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

/** Read a config file and resolve it in one step; `npm run deploy` and the loader test share this seam. */
export async function loadDashboards({ file, env = process.env } = {}) {
  return resolveDashboards(await readConfig(file), env);
}
