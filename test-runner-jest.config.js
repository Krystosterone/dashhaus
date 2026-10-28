import { getJestConfig } from "@storybook/test-runner";

const config = getJestConfig();

/** @type {import("@jest/types").Config.InitialOptions} */
export default {
  ...config,
  modulePathIgnorePatterns: [
    ...(config.modulePathIgnorePatterns ?? []),
    "<rootDir>/.claude/worktrees/",
  ],
};
