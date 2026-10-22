import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import jsxA11y from "eslint-plugin-jsx-a11y";
import globals from "globals";

export default tseslint.config(
  { ignores: ["storybook-static/**", "node_modules/**", ".agents/**"] },
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
    // The Home Assistant boundary: widgets, layout and stories never see the transport or raw
    // entities. Only src/ha/ and the public barrel may import the integration.
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/ha/**", "src/index.ts"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [
          { group: ["home-assistant-js-websocket", "home-assistant-js-websocket/*"], message: "Keep the websocket client under src/ha/." },
          { group: ["**/ha", "**/ha/*"], message: "Widgets stay provider-agnostic; connect them in a src/ha/ container." },
          { group: ["**/index"], message: "Import the module directly, not the public barrel." },
        ],
      }],
    },
  },
);
