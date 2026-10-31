// The dashboard `npx dashhaus-deploy --skip-build` creates. Run `npm run build` first, or drop `--skip-build` and
// add a build() that runs it; settings live in .env beside this file (see the deploy docs).
export default {
  pageTitle: "Home",
  bundle: "dist/dashhaus-__skin__.js",
  dashboards: [
    {
      path: "dashhaus-__skin__",
      title: "Home (__Section__)",
      icon: "mdi:view-dashboard-outline",
      async card() {
        return { card: { type: "custom:__card_type__" }, made: "automatic" };
      },
    },
  ],
};
