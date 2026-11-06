import { resourceFile as field } from "@dashhaus/field/resource";
import { resourceFile as orb } from "@dashhaus/orb/resource";

/** @type {import("@dashhaus/deploy/config").DeployConfig} */
export default {
  pageTitle: "Home",
  // Each skin's resource, the file its package ships; leave out the one you don't use.
  files: [orb, field],
  dashboards: [
    // Each skin's own dashboard, on its strategy: it follows the skin as it updates.
    { path: "home-orb", title: "Home (Orb)", icon: "mdi:home-variant", strategy: { type: "custom:orb-dashboard" } },
    { path: "home-field", title: "Home (Field)", icon: "mdi:knob", strategy: { type: "custom:field-dashboard" } },
    // A dashboard of your own: a skin's card with your cards and rows, created once and then yours to edit.
    {
      path: "my-home",
      title: "My home",
      icon: "mdi:floor-plan",
      card: {
        type: "custom:dashhaus-orb",
        title: "Home",
        rows: [
          { title: "Living room", columns: 2, cards: ["light.living_room", "climate.living_room"] },
          { title: "Outside", cards: ["weather.home"] },
        ],
      },
    },
  ],
};
