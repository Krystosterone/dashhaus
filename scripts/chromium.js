/**
 * The one switch for the repo's browser-driven commands (`npm run test-storybook`, `npm run perf:collect`, the dx
 * journeys' screenshots and details check, and the docs screenshots): `DASHHAUS_CHROMIUM` names an existing Chromium
 * or Chrome executable to launch instead of the build the pinned Playwright downloads (`npx playwright install
 * chromium`). Unset, every command launches Playwright's own build, as before. A path that doesn't exist fails before
 * a browser starts, naming the variable.
 */
import { existsSync } from "node:fs";

export const CHROMIUM_ENV = "DASHHAUS_CHROMIUM";

/** The executable `DASHHAUS_CHROMIUM` names, or undefined when it is unset or empty. */
export function chromiumExecutable(env = process.env) {
  const path = env[CHROMIUM_ENV]?.trim();
  if (!path) return undefined;
  if (!existsSync(path)) throw new Error(`${CHROMIUM_ENV}=${path}: no such file. Point it at a Chromium executable, or unset it to use Playwright's own build.`);
  return path;
}

/** Playwright launch options with the executable `DASHHAUS_CHROMIUM` names, if any; the given options otherwise unchanged. */
export function chromiumLaunchOptions(options = {}, env = process.env) {
  const executablePath = chromiumExecutable(env);
  return executablePath ? { ...options, executablePath } : options;
}
