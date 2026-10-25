import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import jsxA11y from "eslint-plugin-jsx-a11y";
import globals from "globals";

const haBoundary = [
  { group: ["home-assistant-js-websocket", "home-assistant-js-websocket/*"], message: "Keep the websocket client under src/ha/." },
  { group: ["**/ha", "**/ha/*"], message: "Widgets stay provider-agnostic; connect them in a src/ha/ container." },
  { group: ["**/index"], message: "Import the module directly, not the public barrel." },
];
const currentUi = ["**/widgets/**", "**/shared/**", "**/bundles/**", "**/dashboards/**", "**/stories/**", "**/styles/**"];
const uiFolders = (message) => [{ group: [...currentUi, "**/glass/**", "*.css", "**/*.css"], message }];

export default tseslint.config(
  { ignores: ["storybook-static/**", "dist/**", "node_modules/**", ".agents/**"] },
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
    // Template placeholders (`__Name__Widget`) don't start upper-case, so the hooks rule can't tell they're
    // components. What the generator writes from them is linted in src/ like any other file.
    files: ["scripts/new-widget/templates/**"],
    rules: { "react-hooks/rules-of-hooks": "off" },
  },
  {
    // The Home Assistant boundary: widgets, layout and stories never see the transport or raw
    // entities. Only src/ha/ and the public barrel may import the integration.
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/ha/**", "src/index.ts"],
    rules: { "no-restricted-imports": ["error", { patterns: haBoundary }] },
  },
  {
    // Two UIs over the same logic, and neither borrows from the other: what both need moves to src/domains/
    // or src/hooks/.
    files: ["src/{widgets,shared,bundles,dashboards,stories,styles}/**/*.{ts,tsx}"],
    rules: { "no-restricted-imports": ["error", { patterns: [...haBoundary, { group: ["**/glass/**"], message: "The current UI never imports the glass UI; share through src/domains/ or src/hooks/." }] }] },
  },
  {
    files: ["src/glass/**/*.{ts,tsx}"],
    rules: { "no-restricted-imports": ["error", { patterns: [...haBoundary, { group: currentUi, message: "The glass UI never imports the current UI; share through src/domains/ or src/hooks/." }] }] },
  },
  {
    // The domain boundary: entity models and their pure logic know no UI and no framework, so every UI
    // and the Home Assistant mappers can share them.
    files: ["src/domains/**/*.ts"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [...haBoundary, ...uiFolders("Domain models know no UI; move the shared part into src/domains/."), { group: ["react", "react-dom", "react/*"], message: "Domain models are framework-free." }],
      }],
    },
  },
  {
    // React hooks with no UI of their own (the minute clock), shared by every UI and the Home Assistant hooks.
    files: ["src/hooks/**/*.{ts,tsx}"],
    rules: { "no-restricted-imports": ["error", { patterns: [...haBoundary, ...uiFolders("src/hooks/ holds UI-free hooks; keep UI in its own folder.")] }] },
  },
  {
    // Mappers, actions, hooks, the store and history parsing feed every UI, so they stay out of the UI folders.
    // The connected tiles, the public barrel and the Lovelace card are where a UI is chosen.
    files: ["src/ha/**/*.ts"],
    ignores: ["src/ha/index.ts", "src/ha/lovelace/**"],
    rules: { "no-restricted-imports": ["error", { patterns: uiFolders("Keep Home Assistant logic UI-free; import entity models from src/domains/.") }] },
  },
);
