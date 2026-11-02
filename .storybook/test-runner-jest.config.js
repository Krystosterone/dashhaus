import { getJestConfig } from "@storybook/test-runner";
import { chromiumLaunchOptions } from "../scripts/chromium.js";

const config = getJestConfig();
const jestPlaywright = config.testEnvironmentOptions?.["jest-playwright"] ?? {};

/** @type {import("@jest/types").Config.InitialOptions} */
export default {
  ...config,
  // DASHHAUS_CHROMIUM points the runner at an existing Chromium; unset, it launches the pinned Playwright's build.
  testEnvironmentOptions: {
    ...config.testEnvironmentOptions,
    "jest-playwright": { ...jestPlaywright, launchOptions: chromiumLaunchOptions(jestPlaywright.launchOptions) },
  },
  modulePathIgnorePatterns: [
    ...(config.modulePathIgnorePatterns ?? []),
    "<rootDir>/.claude/worktrees/",
  ],
};
