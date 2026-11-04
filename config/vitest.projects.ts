/**
 * The Vitest projects: one per package that owns tests, one for the app (with the documentation site's example tests),
 * one for the repo checks, and one for the generators.
 * Plain data, so the config and `verify/projects.test.ts` can share it without loading Vite into a jsdom test.
 *
 * The generator suites copy the repo and run its tools inside the copy; they are Node-only and keep their own project so
 * the app's jsdom files never queue behind them.
 *
 * Every project but the generators runs in `vmForks`: each test file still gets a fresh module graph and globals (a VM
 * context), but the worker process, and jsdom with it, is loaded once per worker rather than once per file. With the
 * default `forks` pool that per-file process and jsdom start-up was most of the suite's wall time (about 0.7s a file).
 * The generators stay on `forks`: they spawn the repo's own tools and gain nothing from a shared worker.
 */
const project = (name: string, include: string[], environment: "jsdom" | "node" = "jsdom", test: Record<string, unknown> = {}) => ({
  resolve: { conditions: ["source"] },
  test: { name, include, environment, globals: true, pool: "vmForks", ...test },
});

export const projects = [
  project("root", ["src/**/*.test.{ts,tsx}", "apps/**/*.test.ts", "verify/tokens.test.ts", "docs/examples/**/*.test.{ts,tsx}"]),
  project("checks", ["verify/**/*.test.{ts,tsx}"], "node", { exclude: ["verify/tokens.test.ts"] }),
  project("generators", ["scripts/*/*.test.ts"], "node", { pool: "forks" }),
  project("core", ["packages/core/src/**/*.test.{ts,tsx}"]),
  project("dashboard", ["packages/dashboard/src/**/*.test.{ts,tsx}"]),
  project("deploy", ["packages/deploy/src/**/*.test.ts"], "node"),
  project("fake-home-assistant", ["packages/fake-home-assistant/src/**/*.test.ts"], "node"),
];
