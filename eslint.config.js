import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import jsxA11y from "eslint-plugin-jsx-a11y";
import globals from "globals";

const haBoundary = [
  { group: ["home-assistant-js-websocket", "home-assistant-js-websocket/*"], message: "Keep the websocket client under src/ha/." },
  { group: ["**/ha", "**/ha/*"], message: "Cards stay provider-agnostic; connect them in a src/ha/ container." },
  { group: ["**/index"], message: "Import the module directly, not the public barrel." },
];
/** A skin is a whole UI; what every skin shares never imports one. */
const noSkin = (message) => [{ group: ["**/skins/**", "*.css", "**/*.css"], message }];

export default tseslint.config(
  { ignores: ["storybook-static/**", "dist/**", "node_modules/**", ".agents/**", ".claude/worktrees/**"] },
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
    // The Home Assistant boundary: a skin's cards, layout and stories never see the transport or raw entities.
    // Only src/ha/, the public barrel, and a skin's own ha/ (connected tiles) and lovelace/ (its card) may import it.
    // Skins never import each other either; src/skins/boundaries.test.ts checks that.
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/ha/**", "src/index.ts", "src/skins/*/ha/**", "src/skins/*/lovelace/**"],
    rules: { "no-restricted-imports": ["error", { patterns: haBoundary }] },
  },
  {
    // The domain boundary: entity models and their pure logic know no UI and no framework, so every skin and the
    // Home Assistant mappers can share them.
    files: ["src/domains/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [...haBoundary, ...noSkin("Domain models know no UI; move the shared part into src/domains/."), { group: ["react", "react-dom", "react/*"], message: "Domain models are framework-free." }],
      }],
    },
  },
  {
    // React hooks with no UI of their own (the minute clock, a page's nav), for every skin.
    files: ["src/hooks/**/*.{ts,tsx}"],
    rules: { "no-restricted-imports": ["error", { patterns: [...haBoundary, ...noSkin("src/hooks/ holds UI-free hooks; keep UI in its skin.")] }] },
  },
  {
    // Headless interaction primitives (press, slider, sheet): behaviour and semantics, never markup or styles.
    files: ["src/primitives/**/*.{ts,tsx}"],
    rules: { "no-restricted-imports": ["error", { patterns: [...haBoundary, ...noSkin("src/primitives/ is headless; each skin draws the control.")] }] },
  },
  {
    // Mappers, actions, hooks, headless components, the store and the Lovelace element base feed every skin, so
    // they never import one. The bundle's entry is where the skins' cards are registered.
    files: ["src/ha/**/*.{ts,tsx}"],
    ignores: ["src/ha/lovelace/entry.ts"],
    rules: { "no-restricted-imports": ["error", { patterns: noSkin("Keep Home Assistant logic skin-free; import entity models from src/domains/.") }] },
  },
);
