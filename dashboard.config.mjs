// The dashboards `npm run deploy` creates. This file is yours: add, remove or reorder dashboards here and deploy
// follows. Settings stay in `.env` (see `.env.example`); each dashboard may name the keys that override its path and
// sidebar title. Deploy never overwrites a dashboard whose layout exists, so changing a card factory affects the
// first creation only.
import { execFileSync } from "node:child_process";
import { generatedDashboards } from "@dashhaus/deploy/config";
import { resourceFile as field } from "@dashhaus/field/resource";
import { resourceFile as orb } from "@dashhaus/orb/resource";
import { GENERATED_SKINS } from "./scripts/generated-skins.js";
import { autoDashboard } from "@dashhaus/orb/lovelace/auto";

// The page title each card prints in its header; the sidebar titles below tell the dashboards apart.
const PAGE_TITLE = "Home";

/**
 * One dashboard per skin. Orb's layout is generated from the house once, to edit; Field's card, given no cards or rows,
 * lays the house out itself every time it draws.
 */
export default {
  pageTitle: PAGE_TITLE,
  // Each skin's resource, the file its package ships and its Marketplace repository mirrors, then one per skin
  // `npm run new-skin` made. Each file's name makes its resource URL.
  files: [orb, field, ...GENERATED_SKINS.map(({ id }) => `dist/dashhaus-${id}.js`)],
  // The repo's build stays the config's, not the CLI's. Runs in this file's directory.
  build() {
    execFileSync("npm", ["run", "build:ha", "--silent"], { stdio: "inherit" });
  },
  dashboards: [
    {
      path: "dashhaus-orb",
      title: "Home (Orb)",
      icon: "mdi:home-variant",
      env: { path: "HA_DASHBOARD", title: "HA_DASHBOARD_TITLE" },
      async card(ha) {
        const card = autoDashboard(await house(ha), PAGE_TITLE);
        return { card, made: `${card.rows?.length ?? 0} generated rows` };
      },
    },
    {
      path: "dashhaus-field",
      title: "Home (Field)",
      icon: "mdi:knob",
      env: { path: "HA_FIELD_DASHBOARD", title: "HA_FIELD_DASHBOARD_TITLE" },
      async card() {
        return { card: { type: "custom:dashhaus-field", title: PAGE_TITLE }, made: "every light and climate entity by area" };
      },
    },
    // `npm run new-skin` registers each generated skin in scripts/generated-skins.js.
    ...generatedDashboards(GENERATED_SKINS, PAGE_TITLE),
  ],
};

/** The house as `autoDashboard` reads it: states and the entity, device and area registries. */
async function house(ha) {
  const [states, entityRegistry, devices, areas] = await Promise.all([
    ha.send("get_states"),
    ha.send("config/entity_registry/list_for_display").catch(() => undefined),
    ha.send("config/device_registry/list").catch(() => []),
    ha.send("config/area_registry/list").catch(() => []),
  ]);
  return {
    states: Object.fromEntries(states.map((s) => [s.entity_id, s])),
    entities: entityRegistryEntries(entityRegistry),
    devices: Object.fromEntries(devices.map((d) => [d.id, { area_id: d.area_id }])),
    areas: Object.fromEntries(areas.map((a) => [a.area_id, { name: a.name }])),
  };
}

/** `config/entity_registry/list_for_display` → the frontend's `hass.entities` shape. */
function entityRegistryEntries(response) {
  if (!response?.entities) return undefined;
  const categories = response.entity_categories ?? {};
  return Object.fromEntries(response.entities.map((e) => [e.ei, {
    device_id: e.di,
    area_id: e.ai,
    hidden: e.hb === true,
    entity_category: e.ec === undefined ? undefined : categories[e.ec] ?? "other",
  }]));
}
