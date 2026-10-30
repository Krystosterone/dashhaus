import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import jsxA11y from "eslint-plugin-jsx-a11y";
import globals from "globals";

/** Only @dashhaus/core/websocket may import Home Assistant's websocket client. */
const noWebsocket = [{ group: ["home-assistant-js-websocket", "home-assistant-js-websocket/*"], message: "Only @dashhaus/core/websocket imports the Home Assistant websocket client." }];
/** A skin is a whole UI; the headless package never imports one. */
const noSkin = (message) => [{ group: ["**/skins/**", "*.css", "**/*.css"], message }];
/** The package boundary is crossed with @dashhaus/core's exports, never a file inside it. */
const noCoreRelative = [
  { group: ["**/packages/core", "**/packages/core/**"], message: "Cross the package boundary with @dashhaus/core/…" },
];
/** The Home Assistant layer: the store, provider, transport, mappers, actions, useHa* hooks and headless components. */
const coreHa = {
  paths: [{ name: "@dashhaus/core", message: "Cards stay provider-agnostic; connect them in a skin's ha/ container." }],
  patterns: [
    { group: ["@dashhaus/core/websocket", "@dashhaus/core/demo", "@dashhaus/core/testing", "@dashhaus/core/fixtures/*"], message: "Cards stay provider-agnostic; connect them in a skin's ha/ container." },
  ],
};
const noIndex = [{ group: ["**/index"], message: "Import the module directly, not the public barrel." }];
const noOtherSkin = [{ group: ["**/skins/**"], message: "Skins never import each other; what two skins share goes in @dashhaus/core or @dashhaus/dashboard." }];
const noDeepCore = [{ group: ["@dashhaus/core/src/*", "@dashhaus/core/ha/*"], message: "Import a declared @dashhaus/core subpath, not a file inside it." }];
/** Another workspace package is crossed by its declared subpaths, never a file inside it. */
const noDeepPackage = [{ group: ["@dashhaus/*/src/**", "@dashhaus/*/ha/**"], message: "Import a declared @dashhaus subpath, not a file inside a package." }];
/** No relative import crosses into a workspace package: the boundary has a package specifier. */
const noPackageRelative = [
  ...noCoreRelative,
  { group: ["**/packages/dashboard", "**/packages/dashboard/**"], message: "Cross the package boundary with @dashhaus/dashboard." },
];
/** The Lovelace entry and its non-card subpaths stay in a skin's lovelace/ card; every card draws on @dashhaus/dashboard/card. */
const noDashboardEntry = { name: "@dashhaus/dashboard", message: "A card draws on @dashhaus/dashboard/card; only a skin's lovelace/ imports the Lovelace entry." };
const noDashboard = [{
  group: ["@dashhaus/dashboard/schema", "@dashhaus/dashboard/layout", "@dashhaus/dashboard/vite", "@dashhaus/dashboard/conformance", "@dashhaus/dashboard/cli"],
  message: "A card draws on @dashhaus/dashboard/card; the schema, layout, build and CLI subpaths stay in a skin's lovelace/.",
}];

export default tseslint.config(
  { ignores: ["storybook-static/**", "dist/**", "packages/*/dist/**", "release/**", "node_modules/**", ".agents/**", ".claude/worktrees/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{js,mjs}"],
    languageOptions: { globals: globals.node },
  },
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: { globals: globals.browser },
    plugins: { "react-hooks": reactHooks, "jsx-a11y": jsxA11y },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" }],
      eqeqeq: ["error", "smart"],
      ...jsxA11y.flatConfigs.recommended.rules,
    },
  },
  {
    // Template placeholders (`__Name__Card`) don't start upper-case, so the hooks rule can't tell they're
    // components. Generated files are linted normally after their tokens are filled.
    files: ["scripts/new-card/templates/**", "scripts/new-skin/templates/**"],
    rules: { "react-hooks/rules-of-hooks": "off" },
  },
  {
    // Skin adapters fill optional imports and props from the target domain, so template source can look unused.
    // The generated source under src/ is checked without this allowance.
    files: ["scripts/new-card/templates/field/**", "scripts/new-skin/templates/**"],
    rules: {
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-unused-expressions": "off",
    },
  },
  {
    // --- @dashhaus/core layers. Inside the package, imports are relative; only its declared subpaths leave it. ---
    files: ["packages/core/src/entities/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [
          { group: ["react", "react-dom", "react/*", "react-dom/*"], message: "Entity models are framework-free." },
          { group: ["node:*", "fs", "path", "crypto"], message: "Entity models are pure: no Node builtins." },
          { group: ["@dashhaus/core", "@dashhaus/core/*"], message: "Inside @dashhaus/core, import relatively." },
          ...noSkin("Entity models know no UI."),
          ...noWebsocket,
          ...noCoreRelative,
        ],
      }],
    },
  },
  {
    // Headless interaction primitives: behaviour and semantics, never markup, styles or entity models.
    files: ["packages/core/src/primitives/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [
          { group: ["../entities", "../entities/*", "../hooks", "../hooks/*", "../ha", "../ha/*"], message: "Primitives know no entities, hooks or Home Assistant; a skin combines them." },
          { group: ["@dashhaus/core", "@dashhaus/core/*"], message: "Inside @dashhaus/core, import relatively." },
          ...noSkin("Primitives are headless; each skin draws the control."),
          ...noWebsocket,
          ...noCoreRelative,
        ],
      }],
    },
  },
  {
    // React hooks with no UI of their own (the minute clock, a page's nav), for every skin.
    files: ["packages/core/src/hooks/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [
          { group: ["../primitives", "../primitives/*", "../ha", "../ha/*"], message: "UI-free hooks know no primitives and no Home Assistant." },
          { group: ["@dashhaus/core", "@dashhaus/core/*"], message: "Inside @dashhaus/core, import relatively." },
          ...noSkin("hooks/ holds UI-free hooks; keep UI in its skin."),
          ...noWebsocket,
          ...noCoreRelative,
        ],
      }],
    },
  },
  {
    // The Home Assistant layer: mappers, actions, hooks, headless components, the store and the provider. It never
    // imports a primitive or a skin; websocket.ts is the one file that imports the client.
    files: ["packages/core/src/ha/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [
          { group: ["../primitives", "../primitives/*"], message: "The Home Assistant layer knows no UI primitives." },
          { group: ["@dashhaus/core", "@dashhaus/core/*"], message: "Inside @dashhaus/core, import relatively." },
          ...noSkin("Keep Home Assistant logic skin-free; import entity models from ../entities."),
          ...noWebsocket,
          ...noCoreRelative,
        ],
      }],
    },
  },
  {
    // The rest of the package (the demo transports, the testing renderer, the entry): no skins, no websocket client
    // except the one file that owns it.
    files: ["packages/core/src/**/*.{ts,tsx}"],
    ignores: ["packages/core/src/entities/**", "packages/core/src/primitives/**", "packages/core/src/hooks/**", "packages/core/src/ha/**", "packages/core/src/websocket.ts", "packages/core/src/websocket.test.ts"],
    rules: { "no-restricted-imports": ["error", { patterns: [...noSkin("The headless package never imports a skin."), ...noWebsocket, ...noCoreRelative] }] },
  },
  {
    // The Lovelace framework: core's declared subpaths, React and react-dom, never a skin, a stylesheet or the
    // websocket client, and it crosses packages by specifier. verify/dashboard-package.test.ts holds the entry to
    // that interface.
    files: ["packages/dashboard/src/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [
          { group: ["@dashhaus/dashboard", "@dashhaus/dashboard/*"], message: "Inside @dashhaus/dashboard, import relatively." },
          { group: ["../../**"], message: "Cross the package boundary with @dashhaus/core/…" },
          ...noSkin("The dashboard framework is skin-free and CSS-free."),
          ...noWebsocket,
          ...noDeepPackage,
          ...noPackageRelative,
        ],
      }],
    },
  },
  {
    // The deploy CLI is Node-only: it bundles and loads the user's config, and never imports a skin or a browser
    // package. The repo's config is the one file that reaches a skin's generated layout.
    files: ["packages/deploy/**/*.mjs"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [
          { group: ["@dashhaus/core", "@dashhaus/core/*", "@dashhaus/dashboard", "@dashhaus/dashboard/*"], message: "Deploy is Node-only; the user's config imports the dashboard surface, not the CLI." },
          { group: ["**/skins/**", "**/src/skins/**"], message: "Deploy loads the user's config; it never imports a skin." },
          { group: ["**/packages/**"], message: "Deploy never imports a package's source; it bundles the user's config." },
        ],
      }],
    },
  },
  {
    // A skin's cards, layout, foundations and stories never see the connected layer. Only its ha/ containers, its
    // lovelace/ card and its index.ts may import @dashhaus/core's Home Assistant subpaths, and only lovelace/ may import
    // @dashhaus/dashboard; verify/boundaries.test.ts checks the skin-to-skin half.
    files: ["src/skins/**/*.{ts,tsx}"],
    ignores: ["src/skins/*/ha/**", "src/skins/*/lovelace/**", "src/skins/*/index.ts"],
    rules: {
      "no-restricted-imports": ["error", {
        paths: [...coreHa.paths, noDashboardEntry],
        patterns: [
          ...coreHa.patterns,
          { group: ["home-assistant-js-websocket", "home-assistant-js-websocket/*"], message: "Only @dashhaus/core/websocket imports the Home Assistant websocket client." },
          ...noOtherSkin,
          ...noDashboard,
          ...noIndex,
          ...noDeepCore,
          ...noPackageRelative,
        ],
      }],
    },
  },
  {
    // A skin's connected containers and entry reach Home Assistant, but only through core's declared subpaths and
    // never through another skin; the Lovelace framework belongs to its lovelace/ card.
    files: ["src/skins/*/ha/**/*.{ts,tsx}", "src/skins/*/index.ts"],
    rules: {
      "no-restricted-imports": ["error", {
        paths: [noDashboardEntry],
        patterns: [
          { group: ["home-assistant-js-websocket", "home-assistant-js-websocket/*"], message: "Import Connection from @dashhaus/core/websocket." },
          ...noOtherSkin,
          ...noDashboard,
          ...noDeepCore,
          ...noIndex,
          ...noPackageRelative,
        ],
      }],
    },
  },
  {
    // A skin's Lovelace card is the one place that draws on @dashhaus/dashboard; it still imports no other skin and no
    // file inside either package.
    files: ["src/skins/*/lovelace/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [
          { group: ["home-assistant-js-websocket", "home-assistant-js-websocket/*"], message: "Import Connection from @dashhaus/core/websocket." },
          ...noOtherSkin,
          ...noDeepCore,
          ...noDeepPackage,
          ...noIndex,
          ...noPackageRelative,
        ],
      }],
    },
  },
  {
    // The root apps, repo checks and generators consume the packages through their declared subpaths only.
    files: ["apps/**/*.{ts,tsx}", ".storybook/**/*.{ts,tsx}", "verify/**/*.ts", "scripts/**/*.ts"],
    rules: { "no-restricted-imports": ["error", { patterns: [...noPackageRelative] }] },
  },);
