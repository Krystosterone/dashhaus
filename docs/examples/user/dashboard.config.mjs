import { fileURLToPath } from "node:url";
import { bundlePath } from "@dashhaus/bundle";

/** @type {import("@dashhaus/deploy/config").DeployConfig} */
export default {
  pageTitle: "Home",
  bundle: fileURLToPath(bundlePath),
  dashboards: [
    {
      path: "home-orb",
      title: "Home (Orb)",
      icon: "mdi:home-variant",
      async card() {
        return { card: { type: "custom:dashhaus-orb" }, made: "automatic" };
      },
    },
    {
      path: "home-field",
      title: "Home (Field)",
      icon: "mdi:knob",
      async card() {
        return { card: { type: "custom:dashhaus-field" }, made: "automatic" };
      },
    },
  ],
};
