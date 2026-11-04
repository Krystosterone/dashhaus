// @vitest-environment node
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { deploy } from "./deploy.js";
import type { DeployClient } from "./deploy.js";

const directories: string[] = [];

afterEach(async () => {
  await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

/** A Home Assistant websocket that keeps resources, dashboards and saved layouts in memory. */
class FakeHomeAssistant implements DeployClient {
  readonly version = "2026.10.0";
  readonly resources: { id: string; url: string }[] = [];
  readonly dashboards: { id: string; url_path: string; title: string }[] = [];
  readonly saved: { url_path: string; config: Record<string, unknown> }[] = [];
  closed = false;
  failResources = false;
  failSaves = 0;

  async send(type: string, payload: Record<string, unknown> = {}): Promise<unknown> {
    const data = payload as {
      url?: string;
      resource_id?: string;
      url_path?: string;
      title?: string;
      dashboard_id?: string;
      config?: Record<string, unknown>;
    };
    if (type === "lovelace/resources") {
      if (this.failResources) throw new Error("resources are YAML");
      return this.resources;
    }
    if (type === "lovelace/resources/create") {
      this.resources.push({ id: `resource-${this.resources.length + 1}`, url: data.url! });
      return null;
    }
    if (type === "lovelace/resources/update") {
      const resource = this.resources.find((candidate) => candidate.id === data.resource_id);
      if (resource) resource.url = data.url!;
      return null;
    }
    if (type === "lovelace/dashboards/list") return this.dashboards;
    if (type === "lovelace/dashboards/create") {
      this.dashboards.push({ id: `dashboard-${this.dashboards.length + 1}`, url_path: data.url_path!, title: data.title! });
      return null;
    }
    if (type === "lovelace/dashboards/delete") {
      this.dashboards.splice(this.dashboards.findIndex((candidate) => candidate.id === data.dashboard_id), 1);
      return null;
    }
    if (type === "lovelace/dashboards/update") {
      const dashboard = this.dashboards.find((candidate) => candidate.id === data.dashboard_id);
      if (dashboard) dashboard.title = data.title!;
      return null;
    }
    if (type === "lovelace/config/save") {
      if (this.failSaves && this.failSaves--) throw new Error("connection lost");
      this.saved.push({ url_path: data.url_path!, config: data.config! });
      return null;
    }
    if (type === "get_states") return [{ entity_id: "light.bed", state: "on", attributes: { friendly_name: "Bed" } }];
    throw new Error(`unexpected Home Assistant command ${type}`);
  }

  close() {
    this.closed = true;
  }
}

const DASHBOARDS = `export default {
  pageTitle: "Home",
  bundle: "dist/dashhaus.js",
  dashboards: [{
    path: "home-a",
    title: "Home A",
    icon: "mdi:home",
    async card(ha) {
      const states = await ha.send("get_states");
      return { card: { type: "custom:dashhaus-orb", states: states.length }, made: "one card" };
    },
  }],
};`;

async function project(source = DASHBOARDS, writeBundle = true) {
  const directory = await mkdtemp(join(tmpdir(), "deploy-run-"));
  directories.push(directory);
  await mkdir(join(directory, "dist"), { recursive: true });
  await mkdir(join(directory, "www"), { recursive: true });
  await writeFile(join(directory, "dashboard.config.mjs"), source);
  if (writeBundle) await writeFile(join(directory, "dist", "dashhaus.js"), "console.log('bundle');");
  return directory;
}

const settings = (directory: string) => ({
  HA_URL: "http://ha.test/",
  HA_TOKEN: "token",
  HA_WWW: join(directory, "www"),
});

describe("deploy", () => {
  it("creates a dashboard and its layout on the first run, then never overwrites the layout", async () => {
    const directory = await project();
    const ha = new FakeHomeAssistant();
    const messages: string[] = [];
    let connected = "";
    const run = () => deploy({
      configFile: join(directory, "dashboard.config.mjs"),
      env: settings(directory),
      skipBuild: true,
      report: (message) => messages.push(message),
      warn: (message) => messages.push(message),
      connect: async (url) => { connected = url; return ha; },
    });

    const first = await run();
    expect(connected).toBe("http://ha.test");
    expect(first.dashboards).toEqual([{ path: "home-a", title: "Home A", status: "created" }]);
    expect(ha.dashboards).toEqual([{ id: "dashboard-1", url_path: "home-a", title: "Home A" }]);
    expect(ha.saved).toHaveLength(1);
    expect(ha.saved[0].config).toEqual({
      views: [{ title: "Home", path: "home", type: "panel", cards: [{ type: "custom:dashhaus-orb", states: 1 }] }],
    });
    expect(ha.resources).toEqual([{ id: "resource-1", url: `/local/dashhaus/dashhaus.js?v=${first.version}` }]);
    expect(await readFile(join(directory, "www", "dashhaus", "dashhaus.js"), "utf8")).toBe("console.log('bundle');");
    expect(ha.closed).toBe(true);

    const second = await run();
    expect(second.dashboards).toEqual([{ path: "home-a", title: "Home A", status: "existing", renamed: false }]);
    expect(ha.dashboards).toHaveLength(1);
    expect(ha.saved).toHaveLength(1);
    expect(ha.resources).toHaveLength(1);
    expect(messages.some((message) => message.includes("its layout is yours and was left alone"))).toBe(true);
  });

  it("deletes a dashboard whose layout failed to save, so the next run creates it again", async () => {
    const directory = await project();
    const ha = new FakeHomeAssistant();
    ha.failSaves = 1;
    const run = () => deploy({
      configFile: join(directory, "dashboard.config.mjs"),
      env: settings(directory),
      skipBuild: true,
      report: () => {},
      warn: () => {},
      connect: async () => ha,
    });

    await expect(run()).rejects.toThrow(/connection lost/);
    expect(ha.dashboards).toEqual([]);
    const second = await run();
    expect(second.dashboards).toEqual([{ path: "home-a", title: "Home A", status: "created" }]);
    expect(ha.saved).toHaveLength(1);
  });

  it("renames an existing dashboard without saving its layout", async () => {
    const directory = await project();
    const ha = new FakeHomeAssistant();
    ha.dashboards.push({ id: "dashboard-1", url_path: "home-a", title: "Old name" });
    const result = await deploy({
      configFile: join(directory, "dashboard.config.mjs"),
      env: settings(directory),
      skipBuild: true,
      report: () => {},
      connect: async () => ha,
    });
    expect(result.dashboards[0]).toMatchObject({ status: "existing", renamed: true });
    expect(ha.dashboards[0].title).toBe("Home A");
    expect(ha.saved).toEqual([]);
  });

  it("runs the config's build, with the config's directory as cwd", async () => {
    const directory = await project(`import { writeFileSync } from "node:fs";
export default {
  pageTitle: "Home",
  bundle: "dist/built.js",
  build() {
    writeFileSync("dist/built.js", "built here");
  },
  dashboards: [{
    path: "home-a",
    title: "Home A",
    icon: "mdi:home",
    async card() { return { card: { type: "custom:dashhaus-orb" }, made: "one card" }; },
  }],
};`, false);
    const ha = new FakeHomeAssistant();
    const messages: string[] = [];
    const result = await deploy({
      configFile: join(directory, "dashboard.config.mjs"),
      env: settings(directory),
      report: (message) => messages.push(message),
      connect: async () => ha,
    });
    expect(messages.some((message) => message.includes("Building the dashboard bundle"))).toBe(true);
    expect(await readFile(join(directory, "www", "built", "built.js"), "utf8")).toBe("built here");
    expect(result.resource.url).toBe(`/local/built/built.js?v=${result.version}`);
  });

  it("skips the build with --skip-build and reads the prebuilt bundle", async () => {
    const directory = await project(`export default {
  bundle: "dist/dashhaus.js",
  build() { throw new Error("the build must not run"); },
  dashboards: [{
    path: "home-a",
    title: "Home A",
    icon: "mdi:home",
    async card() { return { card: { type: "custom:dashhaus-orb" }, made: "one card" }; },
  }],
};`);
    const ha = new FakeHomeAssistant();
    await expect(deploy({
      configFile: join(directory, "dashboard.config.mjs"),
      env: settings(directory),
      skipBuild: true,
      report: () => {},
      connect: async () => ha,
    })).resolves.toMatchObject({ dashboards: [{ path: "home-a", status: "created" }] });
  });

  it("refuses a missing bundle and reports a failed build", async () => {
    const missing = await project(DASHBOARDS, false);
    await expect(deploy({
      configFile: join(missing, "dashboard.config.mjs"),
      env: settings(missing),
      skipBuild: true,
      report: () => {},
      connect: async () => new FakeHomeAssistant(),
    })).rejects.toThrowError("is missing");

    const failed = await project(`export default {
  bundle: "dist/dashhaus.js",
  build() { throw new Error("vite exploded"); },
  dashboards: [],
};`);
    await expect(deploy({
      configFile: join(failed, "dashboard.config.mjs"),
      env: settings(failed),
      report: () => {},
      connect: async () => new FakeHomeAssistant(),
    })).rejects.toThrowError("The build failed: vite exploded");
  });

  it("warns instead of failing when Home Assistant cannot manage resources", async () => {
    const directory = await project();
    const ha = new FakeHomeAssistant();
    ha.failResources = true;
    const messages: string[] = [];
    const result = await deploy({
      configFile: join(directory, "dashboard.config.mjs"),
      env: settings(directory),
      skipBuild: true,
      report: (message) => messages.push(message),
      warn: (message) => messages.push(message),
      connect: async () => ha,
    });
    expect(result.resource.error).toBe("resources are YAML");
    expect(messages.some((message) => message.includes("If your dashboards are in YAML mode"))).toBe(true);
    expect(ha.saved).toHaveLength(1);
  });

  it("refuses a deploy without the settings .env must hold", async () => {
    const directory = await project();
    await expect(deploy({
      configFile: join(directory, "dashboard.config.mjs"),
      env: {},
      skipBuild: true,
      report: () => {},
      connect: async () => new FakeHomeAssistant(),
    })).rejects.toThrowError("HA_URL");
  });

  it("checks that Home Assistant serves the uploaded file from /local/", async () => {
    const directory = await project();
    const fetched: string[] = [];
    const run = async (serve: (url: string) => Promise<{ ok: boolean; status: number; arrayBuffer(): Promise<ArrayBuffer> }>) => {
      const reports: string[] = [];
      const warnings: string[] = [];
      await deploy({
        configFile: join(directory, "dashboard.config.mjs"),
        env: settings(directory),
        skipBuild: true,
        report: (message) => reports.push(message),
        warn: (message) => warnings.push(message),
        connect: async () => new FakeHomeAssistant(),
        fetch: async (url) => { fetched.push(url); return serve(url); },
      });
      return { reports, warnings };
    };
    const body = (text: string) => async () => new TextEncoder().encode(text).buffer as ArrayBuffer;

    const served = await run(async () => ({ ok: true, status: 200, arrayBuffer: body("console.log('bundle');") }));
    expect(fetched[0]).toMatch(/^http:\/\/ha\.test\/local\/dashhaus\/dashhaus\.js\?v=[0-9a-f]{10}$/);
    expect(served.warnings).toEqual([]);
    expect(served.reports.join("\n")).toContain("the uploaded file");

    const missing = await run(async () => ({ ok: false, status: 404, arrayBuffer: body("") }));
    expect(missing.warnings.join("\n")).toContain("HTTP 404");
    expect(missing.warnings.join("\n")).toContain("HA_WWW");

    const stale = await run(async () => ({ ok: true, status: 200, arrayBuffer: body("an older bundle") }));
    expect(stale.warnings.join("\n")).toContain("serves a different file");
  });
});
