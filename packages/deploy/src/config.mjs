// The author-facing deploy config surface: the shape a `dashboard.config.mjs` declares and the one helper a repo
// composes its generated skins with. It imports no Node builtin, no React and no dashboard package, so a config and a
// Node-only deploy app can import it. The loader that reads the config is `./load.mjs`.

/** One dashboard per generated skin, in the shape a config declares its own. */
export function generatedDashboards(skins, title = "Home") {
  return skins.map(({ id, title: sidebar, icon }) => ({
    path: `dashhaus-${id}`,
    title: sidebar,
    icon,
    async card() {
      return { card: { type: `custom:dashhaus-${id}`, title }, made: `the ${id} skin's automatic layout` };
    },
  }));
}
