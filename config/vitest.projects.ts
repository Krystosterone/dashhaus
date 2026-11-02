/**
 * The Vitest projects: one per public package, one for the app (with the documentation site's example tests), one for
 * the repo checks, and one for the generators.
 * Plain data, so the config and `verify/projects.test.ts` can share it without loading Vite into a jsdom test.
 *
 * The generator suites copy the repo and run its tools inside the copy; they are Node-only and keep their own project so
 * the app's jsdom files never queue behind them.
 */
const project = (name: string, include: string[], environment: "jsdom" | "node" = "jsdom", test: Record<string, unknown> = {}) => ({
  resolve: { conditions: ["source"] },
  test: { name, include, environment, globals: true, ...test },
});

export const projects = [
  project("root", ["src/**/*.test.{ts,tsx}", "verify/tokens.test.ts", "docs/examples/**/*.test.{ts,tsx}"]),
  project("checks", ["verify/**/*.test.{ts,tsx}"], "node", { exclude: ["verify/tokens.test.ts"] }),
  project("generators", ["scripts/*/*.test.ts"], "node"),
  project("core", ["packages/core/src/**/*.test.{ts,tsx}"]),
  project("dashboard", ["packages/dashboard/src/**/*.test.{ts,tsx}"]),
  project("deploy", ["packages/deploy/src/**/*.test.ts"], "node"),
];
