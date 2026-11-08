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
    // A wall panel's dashboard for each skin: its card with layout: wall lays the house out one column per place each
    // time it draws, read from across the room, and its nav leads back to the skin's own dashboard.
    {
      path: "wall-orb",
      title: "Wall (Orb)",
      icon: "mdi:tablet-dashboard",
      card: { type: "custom:dashhaus-orb", layout: "wall", viewing: "far", nav: [{ page: "home" }, { navigate: "/home-orb" }] },
    },
    {
      path: "wall-field",
      title: "Wall (Field)",
      icon: "mdi:tablet-dashboard",
      card: { type: "custom:dashhaus-field", layout: "wall", viewing: "far", nav: [{ page: "home" }, { navigate: "/home-field" }] },
    },
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
