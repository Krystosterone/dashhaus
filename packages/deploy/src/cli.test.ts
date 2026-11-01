// @vitest-environment node
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { helpText, main, parseArgs } from "./cli.mjs";
import type { DeployClient } from "./deploy.mjs";

const directories: string[] = [];

afterEach(async () => {
  await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

async function project() {
  const directory = await mkdtemp(join(tmpdir(), "deploy-cli-"));
  directories.push(directory);
  await mkdir(join(directory, "dist"), { recursive: true });
  await mkdir(join(directory, "www"), { recursive: true });
  await writeFile(join(directory, "dist", "dashhaus.js"), "bundle");
  await writeFile(join(directory, "dashboard.config.mjs"), `export default {
  pageTitle: "Home",
  bundle: "dist/dashhaus.js",
  dashboards: [{
    path: "home-a",
    title: "Home A",
    icon: "mdi:home",
    env: { path: "HA_DASHBOARD" },
    async card() { return { card: { type: "custom:dashhaus-orb" }, made: "one card" }; },
  }],
};`);
  return directory;
}

const client = (): DeployClient & { dashboards: unknown[]; saved: unknown[] } => {
  const dashboards: unknown[] = [];
  const saved: unknown[] = [];
  return {
    version: "2026.10.0",
    dashboards,
    saved,
    async send(type, payload) {
      if (type === "lovelace/resources") return [];
      if (type === "lovelace/resources/create") return null;
      if (type === "lovelace/dashboards/list") return dashboards;
      if (type === "lovelace/dashboards/create") { dashboards.push(payload); return null; }
      if (type === "lovelace/config/save") { saved.push(payload); return null; }
      throw new Error(`unexpected ${type}`);
    },
    close() {},
  };
};

describe("parseArgs", () => {
  it("reads the config path, --skip-build and --help", () => {
    expect(parseArgs([])).toEqual({ config: undefined, skipBuild: false, help: false });
    expect(parseArgs(["--config", "deploy.mjs", "--skip-build"])).toEqual({ config: "deploy.mjs", skipBuild: true, help: false });
    expect(parseArgs(["--config=custom.mjs"])).toEqual({ config: "custom.mjs", skipBuild: false, help: false });
    expect(parseArgs(["--help"]).help).toBe(true);
    expect(parseArgs(["-h"]).help).toBe(true);
  });

  it("refuses an unknown option or a --config without a file", () => {
    expect(() => parseArgs(["--wat"])).toThrowError('Unknown option "--wat". Run --help.');
    expect(() => parseArgs(["--config"])).toThrowError("--config needs a file");
    expect(() => parseArgs(["--config="])).toThrowError("--config needs a file");
  });
});

describe("helpText", () => {
  it("lists the dashboards the config declares", () => {
    const text = helpText([
      { path: "home-a", title: "Home A", icon: "mdi:home", card: async () => ({ card: {}, made: "" }) },
      { path: "home-long", title: "Home Long", icon: "mdi:home", card: async () => ({ card: {}, made: "" }) },
    ], "/configs/dashboard.config.mjs");
    expect(text).toContain("dashhaus-deploy [--config <file>] [--skip-build]");
    expect(text).toContain("Home A     /home-a");
    expect(text).toContain("Home Long  /home-long");
    expect(text).toContain("/configs/dashboard.config.mjs");
    expect(text).toContain(".env");
  });

  it("without a config, says so and prints a config and a .env to start from", () => {
    const text = helpText(undefined, "/somewhere/dashboard.config.mjs");
    expect(text).toContain("/somewhere/dashboard.config.mjs");
    expect(text).toContain("not found");
    expect(text).toContain('import { bundlePath } from "@dashhaus/bundle"');
    expect(text).toContain("custom:dashhaus-orb");
    expect(text).toMatch(/HA_URL=.*\n.*HA_TOKEN=.*\n.*HA_WWW=/);
    expect(text).not.toContain(".env.example");
  });
});

describe("main", () => {
  it("prints help from the config without needing the .env settings", async () => {
    const directory = await project();
    const messages: string[] = [];
    const code = await main({
      argv: ["--help"],
      cwd: directory,
      env: {},
      report: (message) => messages.push(message),
      error: (message) => messages.push(message),
    });
    expect(code).toBe(0);
    expect(messages.join("\n")).toContain("Home A");
    expect(messages.join("\n")).toContain("/home-a");
  });

  it("prints help with a starter config in an empty folder", async () => {
    const directory = await mkdtemp(join(tmpdir(), "deploy-cli-"));
    directories.push(directory);
    const messages: string[] = [];
    const code = await main({ argv: ["--help"], cwd: directory, env: {}, report: (message) => messages.push(message), error: (message) => messages.push(message) });
    expect(code).toBe(0);
    expect(messages.join("\n")).toContain("Write dashboard.config.mjs");
    expect(messages.join("\n")).toContain("@dashhaus/bundle");
  });

  it("names the missing config and where to start, instead of a resolver error", async () => {
    const directory = await mkdtemp(join(tmpdir(), "deploy-cli-"));
    directories.push(directory);
    const messages: string[] = [];
    const code = await main({ argv: [], cwd: directory, env: {}, report: (message) => messages.push(message), error: (message) => messages.push(message) });
    expect(code).toBe(1);
    expect(messages.join("\n")).toContain(`No config at ${join(directory, "dashboard.config.mjs")}`);
    expect(messages.join("\n")).toContain("--help");
    expect(messages.join("\n")).not.toContain("Could not resolve");
  });

  it("runs the deploy and returns 0", async () => {
    const directory = await project();
    const ha = client();
    const code = await main({
      argv: ["--config", join(directory, "dashboard.config.mjs"), "--skip-build"],
      cwd: directory,
      env: { HA_URL: "http://ha.test", HA_TOKEN: "token", HA_WWW: join(directory, "www") },
      report: () => {},
      error: () => {},
      connect: async () => ha,
    });
    expect(code).toBe(0);
    expect(ha.dashboards).toHaveLength(1);
    expect(ha.saved).toHaveLength(1);
  });

  it("reads settings and dashboard overrides from the .env beside the config", async () => {
    const directory = await project();
    await writeFile(join(directory, ".env"), [
      "HA_URL=http://ha.test",
      "HA_TOKEN=token",
      `HA_WWW=${join(directory, "www")}`,
      "HA_DASHBOARD=my-house",
    ].join("\n"));
    const ha = client();
    const keys = ["HA_URL", "HA_TOKEN", "HA_WWW", "HA_DASHBOARD"];
    const saved = new Map(keys.map((key) => [key, process.env[key]]));
    for (const key of keys) delete process.env[key];
    try {
      const code = await main({
        argv: ["--skip-build"],
        cwd: directory,
        env: {},
        report: () => {},
        error: () => {},
        connect: async () => ha,
      });
      expect(code).toBe(0);
      expect(ha.dashboards[0]).toMatchObject({ url_path: "my-house" });
    } finally {
      for (const key of keys) {
        const value = saved.get(key);
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
    }
  });

  it("prints a config's error and returns 1", async () => {
    const directory = await project();
    const messages: string[] = [];
    const code = await main({
      argv: [],
      cwd: directory,
      env: {},
      report: (message) => messages.push(message),
      error: (message) => messages.push(message),
    });
    expect(code).toBe(1);
    expect(messages.join("\n")).toContain("HA_URL");
  });

  it("returns 1 for an unknown option", async () => {
    const messages: string[] = [];
    const code = await main({ argv: ["--nope"], report: (message) => messages.push(message), error: (message) => messages.push(message) });
    expect(code).toBe(1);
    expect(messages.join("\n")).toContain('Unknown option "--nope"');
  });
});
