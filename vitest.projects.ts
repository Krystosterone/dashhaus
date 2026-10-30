/**
 * The Vitest projects: one per public package, and one for the app, the repo checks and the generators. Plain data,
 * so the config and `verify/projects.test.ts` can share it without loading Vite into a jsdom test.
 */
const project = (name: string, include: string[], environment: "jsdom" | "node" = "jsdom") => ({
  resolve: { conditions: ["source"] },
  test: { name, include, environment, globals: true },
});

export const projects = [
  project("root", ["src/**/*.test.{ts,tsx}", "verify/**/*.test.{ts,tsx}", "scripts/*/*.test.ts"]),
  project("core", ["packages/core/src/**/*.test.{ts,tsx}"]),
  project("dashboard", ["packages/dashboard/src/**/*.test.{ts,tsx}"]),
  project("deploy", ["packages/deploy/src/**/*.test.ts"], "node"),
];
