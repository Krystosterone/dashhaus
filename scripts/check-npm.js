#!/usr/bin/env node
/**
 * The root `preinstall`: refuse an npm other than the one root `package.json` pins in `packageManager`, and say the
 * fix. Another npm rewrites package-lock.json (npm 10 drops `libc` and flips `devOptional`) without a word.
 *
 * It is the second guard. `devEngines.packageManager` stops npm 10.9 and later before they read or write anything;
 * an older npm ignores that field, and npm runs a root `preinstall` only after it has written the lockfile, so this
 * check can only fail loudly and say to restore it. Run from anything but npm (a direct `node`), it does nothing.
 */
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

/** The pinned npm version from a `packageManager` value such as `npm@11.18.0`, or undefined for another manager. */
export function pinnedNpm(packageManager) {
  return /^npm@(\d+\.\d+\.\d+)/.exec(packageManager ?? "")?.[1];
}

/** The npm version in `npm_config_user_agent` (`npm/11.18.0 node/v22.22.0 …`), or undefined when npm isn't running. */
export function runningNpm(userAgent) {
  return /(?:^|\s)npm\/(\d+\.\d+\.\d+)/.exec(userAgent ?? "")?.[1];
}

const parts = (version) => version.split(".").map(Number);
/** Whether `version` is at least `floor`. */
export function atLeast(version, floor) {
  const [a, b] = [parts(version), parts(floor)];
  for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] > b[i];
  return true;
}

/** What is wrong with the running npm, in words that say the fix; null when it is the pinned one or newer. */
export function npmProblem(userAgent, packageManager) {
  const running = runningNpm(userAgent);
  const pinned = pinnedNpm(packageManager);
  if (!running || !pinned || atLeast(running, pinned)) return null;
  return [
    `dashhaus: npm ${running} is running, but package.json pins npm@${pinned} (packageManager).`,
    "Another npm rewrites package-lock.json. To fix it:",
    "  corepack enable npm      # npm now resolves to the pinned version in this repository",
    "  git checkout package-lock.json",
    "  npm install",
  ].join("\n");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const manifest = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
  const problem = npmProblem(process.env.npm_config_user_agent, manifest.packageManager);
  if (problem) {
    console.error(problem);
    process.exit(1);
  }
}
