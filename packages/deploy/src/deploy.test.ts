// @vitest-environment node
import { chmod, mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";
import { startFakeHomeAssistant } from "@dashhaus/fake-home-assistant";
import { afterEach, describe, expect, it } from "vitest";
import { connectHomeAssistant, deploy } from "./deploy.js";
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
  /** The command at which Home Assistant goes away: it and every later one fail as a lost connection does. */
  dropAt = "";
  dropped = false;

  async send(type: string, payload: Record<string, unknown> = {}): Promise<unknown> {
    if (type === this.dropAt) this.dropped = true;
    if (this.dropped) throw Object.assign(new Error("Home Assistant closed the connection."), { closed: true });
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
  files: ["dist/orb-dashboard.js"],
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

async function project(source = DASHBOARDS, writeResource = true) {
  const directory = await mkdtemp(join(tmpdir(), "deploy-run-"));
  directories.push(directory);
  await mkdir(join(directory, "dist"), { recursive: true });
  await mkdir(join(directory, "www"), { recursive: true });
  await writeFile(join(directory, "dashboard.config.mjs"), source);
  if (writeResource) await writeFile(join(directory, "dist", "orb-dashboard.js"), "console.log('orb');");
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
    const [resource] = first.resources;
    expect(resource).toEqual({ name: "orb-dashboard.js", url: `/local/orb-dashboard/orb-dashboard.js?v=${resource.version}`, version: expect.stringMatching(/^[0-9a-f]{10}$/), updated: false });
    expect(ha.resources).toEqual([{ id: "resource-1", url: resource.url }]);
    expect(await readFile(join(directory, "www", "orb-dashboard", "orb-dashboard.js"), "utf8")).toBe("console.log('orb');");
    expect(ha.closed).toBe(true);

    const second = await run();
    expect(second.dashboards).toEqual([{ path: "home-a", title: "Home A", status: "existing", renamed: false }]);
    expect(ha.dashboards).toHaveLength(1);
    expect(ha.saved).toHaveLength(1);
    expect(ha.resources).toHaveLength(1);
    expect(second.resources[0]).toMatchObject({ url: resource.url, updated: true });
    expect(messages.some((message) => message.includes("its layout is yours and was left alone"))).toBe(true);
    expect(messages.at(-1)).toContain(`to pick up orb-dashboard.js version ${resource.version}.`);
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
  files: ["dist/built.js"],
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
    expect(messages.some((message) => message.includes("Running the config's build"))).toBe(true);
    expect(await readFile(join(directory, "www", "built", "built.js"), "utf8")).toBe("built here");
    expect(result.resources[0].url).toBe(`/local/built/built.js?v=${result.resources[0].version}`);
  });

  it("skips the build with --skip-build and reads the prebuilt file", async () => {
    const directory = await project(`export default {
  files: ["dist/orb-dashboard.js"],
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

  it("refuses a missing file and reports a failed build", async () => {
    const missing = await project(DASHBOARDS, false);
    await expect(deploy({
      configFile: join(missing, "dashboard.config.mjs"),
      env: settings(missing),
      skipBuild: true,
      report: () => {},
      connect: async () => new FakeHomeAssistant(),
    })).rejects.toThrowError("is missing");

    const failed = await project(`export default {
  files: ["dist/orb-dashboard.js"],
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
    expect(result.resources[0].error).toBe("resources are YAML");
    expect(messages.some((message) => message.includes("If your dashboards are in YAML mode"))).toBe(true);
    expect(ha.saved).toHaveLength(1);
  });

  it("warns when another copy of a file is registered too, as a Marketplace install's", async () => {
    const directory = await project();
    const ha = new FakeHomeAssistant();
    ha.resources.push({ id: "resource-hacs", url: "/hacsfiles/orb-dashboard/orb-dashboard.js?hacstag=123456789030" });
    const messages: string[] = [];
    await deploy({
      configFile: join(directory, "dashboard.config.mjs"),
      env: settings(directory),
      skipBuild: true,
      report: () => {},
      warn: (message) => messages.push(message),
      connect: async () => ha,
    });
    expect(messages.some((message) => message.includes("Another orb-dashboard.js is also registered (/hacsfiles/orb-dashboard/orb-dashboard.js)"))).toBe(true);
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

    const served = await run(async () => ({ ok: true, status: 200, arrayBuffer: body("console.log('orb');") }));
    expect(fetched[0]).toMatch(/^http:\/\/ha\.test\/local\/orb-dashboard\/orb-dashboard\.js\?v=[0-9a-f]{10}$/);
    expect(served.warnings).toEqual([]);
    expect(served.reports.join("\n")).toContain("the uploaded file");

    const missing = await run(async () => ({ ok: false, status: 404, arrayBuffer: body("") }));
    expect(missing.warnings.join("\n")).toContain("HTTP 404");
    expect(missing.warnings.join("\n")).toContain("HA_WWW");

    const stale = await run(async () => ({ ok: true, status: 200, arrayBuffer: body("an older resource") }));
    expect(stale.warnings.join("\n")).toContain("serves a different file");
  });
  it("uploads, registers and checks every file the config names, after one build", async () => {
    const directory = await project(`import { appendFileSync, writeFileSync } from "node:fs";
export default {
  files: ["dist/orb-dashboard.js", "dist/field-dashboard.js"],
  build() {
    appendFileSync("builds.txt", "built\\n");
    writeFileSync("dist/orb-dashboard.js", "orb");
    writeFileSync("dist/field-dashboard.js", "field");
  },
  dashboards: [
    { path: "home-orb", title: "Home (Orb)", icon: "mdi:home-variant", strategy: { type: "custom:orb-dashboard" } },
    { path: "home-field", title: "Home (Field)", icon: "mdi:knob", strategy: { type: "custom:field-dashboard" } },
  ],
};`, false);
    const ha = new FakeHomeAssistant();
    ha.resources.push({ id: "resource-old", url: "/local/field-dashboard/field-dashboard.js?v=0000000000" });
    const fetched: string[] = [];
    const messages: string[] = [];
    const served = new Map([["orb-dashboard.js", "orb"], ["field-dashboard.js", "field"]]);
    const result = await deploy({
      configFile: join(directory, "dashboard.config.mjs"),
      env: settings(directory),
      report: (message) => messages.push(message),
      warn: (message) => messages.push(`WARN ${message}`),
      connect: async () => ha,
      fetch: async (url) => {
        fetched.push(url);
        const name = new URL(url).pathname.split("/").at(-1)!;
        return { ok: true, status: 200, arrayBuffer: async () => new TextEncoder().encode(served.get(name)).buffer as ArrayBuffer };
      },
    });
    expect(await readFile(join(directory, "builds.txt"), "utf8")).toBe("built\n");
    expect(await readFile(join(directory, "www", "orb-dashboard", "orb-dashboard.js"), "utf8")).toBe("orb");
    expect(await readFile(join(directory, "www", "field-dashboard", "field-dashboard.js"), "utf8")).toBe("field");
    expect(result.resources.map(({ name, updated }) => ({ name, updated }))).toEqual([
      { name: "orb-dashboard.js", updated: false },
      { name: "field-dashboard.js", updated: true },
    ]);
    const [orb, field] = result.resources;
    expect(orb.version).not.toBe(field.version);
    expect(ha.resources).toEqual([
      { id: "resource-old", url: `/local/field-dashboard/field-dashboard.js?v=${field.version}` },
      { id: "resource-2", url: `/local/orb-dashboard/orb-dashboard.js?v=${orb.version}` },
    ]);
    expect(fetched).toEqual([`http://ha.test${orb.url}`, `http://ha.test${field.url}`]);
    expect(messages.filter((message) => message.startsWith("WARN"))).toEqual([]);
    expect(messages.filter((message) => message.includes("the uploaded file"))).toHaveLength(2);
    expect(messages.at(-1)).toContain(`orb-dashboard.js version ${orb.version}, field-dashboard.js version ${field.version}`);
    expect(ha.saved).toEqual([
      { url_path: "home-orb", config: { strategy: { type: "custom:orb-dashboard" } } },
      { url_path: "home-field", config: { strategy: { type: "custom:field-dashboard" } } },
    ]);
  });

  it("warns per file when resources can't be managed, and per file another copy is registered", async () => {
    const directory = await project(`export default {
  files: ["dist/orb-dashboard.js", "dist/field-dashboard.js"],
  dashboards: [],
};`, false);
    await writeFile(join(directory, "dist", "orb-dashboard.js"), "orb");
    await writeFile(join(directory, "dist", "field-dashboard.js"), "field");
    const run = async (ha: FakeHomeAssistant) => {
      const warnings: string[] = [];
      const result = await deploy({
        configFile: join(directory, "dashboard.config.mjs"),
        env: settings(directory),
        skipBuild: true,
        report: () => {},
        warn: (message) => warnings.push(message),
        connect: async () => ha,
      });
      return { result, warnings };
    };

    const yaml = new FakeHomeAssistant();
    yaml.failResources = true;
    const { result, warnings } = await run(yaml);
    expect(result.resources.map((resource) => resource.error)).toEqual(["resources are YAML", "resources are YAML"]);
    expect(warnings).toHaveLength(2);
    expect(warnings[0]).toContain(`- url: ${result.resources[0].url}`);
    expect(warnings[1]).toContain(`- url: ${result.resources[1].url}`);

    const marketplace = new FakeHomeAssistant();
    marketplace.resources.push({ id: "resource-hacs", url: "/hacsfiles/field-dashboard/field-dashboard.js?hacstag=1" });
    const other = await run(marketplace);
    expect(other.warnings).toEqual([expect.stringContaining("Another field-dashboard.js is also registered (/hacsfiles/field-dashboard/field-dashboard.js)")]);
  });

  it("saves a strategy dashboard as { strategy } and a card's config as written in one panel view", async () => {
    const directory = await project(`export default {
  pageTitle: "Flat",
  files: ["dist/orb-dashboard.js"],
  dashboards: [
    { path: "home-orb", title: "Home (Orb)", icon: "mdi:home-variant", strategy: { type: "custom:orb-dashboard", theme: "dark" } },
    { path: "my-home", title: "My home", icon: "mdi:floor-plan", card: { type: "custom:dashhaus-orb", title: "Home", cards: ["light.kitchen"] } },
  ],
};`);
    const ha = new FakeHomeAssistant();
    const messages: string[] = [];
    const result = await deploy({
      configFile: join(directory, "dashboard.config.mjs"),
      env: settings(directory),
      skipBuild: true,
      report: (message) => messages.push(message),
      connect: async () => ha,
    });
    expect(result.dashboards.map(({ path, status }) => [path, status])).toEqual([["home-orb", "created"], ["my-home", "created"]]);
    expect(ha.saved).toEqual([
      { url_path: "home-orb", config: { strategy: { type: "custom:orb-dashboard", theme: "dark" } } },
      {
        url_path: "my-home",
        config: { views: [{ title: "Flat", path: "home", type: "panel", cards: [{ type: "custom:dashhaus-orb", title: "Home", cards: ["light.kitchen"] }] }] },
      },
    ]);
    expect(messages).toContain("  ✓ created with the custom:orb-dashboard strategy");
    expect(messages).toContain("  ✓ created with your card");
  });

  it("refuses a config whose dashboards or files it cannot deploy, before touching Home Assistant", async () => {
    const run = async (source: string) => {
      const directory = await project(source);
      return deploy({
        configFile: join(directory, "dashboard.config.mjs"),
        env: settings(directory),
        skipBuild: true,
        report: () => {},
        connect: async () => { throw new Error("must not connect"); },
      });
    };
    await expect(run(`export default { files: ["dist/orb-dashboard.js"], dashboards: [
  { path: "home-a", title: "A", icon: "mdi:home", card: { type: "custom:dashhaus-orb" }, strategy: { type: "custom:orb-dashboard" } },
] };`)).rejects.toThrowError("dashboards[0] takes a card or a strategy, not both");
    await expect(run(`export default { files: ["dist/orb-dashboard.js"], dashboards: [{ path: "home-a", title: "A", icon: "mdi:home" }] };`))
      .rejects.toThrowError("dashboards[0] needs a card");
    await expect(run(`export default { files: [], dashboards: [] };`)).rejects.toThrowError("files must name at least one file to upload");
  });

  it("copies nothing when Home Assistant refuses the token, so the served file keeps its resource's version", async () => {
    const directory = await project();
    const messages: string[] = [];
    await expect(deploy({
      configFile: join(directory, "dashboard.config.mjs"),
      env: settings(directory),
      skipBuild: true,
      report: (message) => messages.push(message),
      connect: async () => { throw new Error("Home Assistant rejected HA_TOKEN. Create a new long-lived access token."); },
    })).rejects.toThrowError("rejected HA_TOKEN");
    expect(await readdir(join(directory, "www"))).toEqual([]);
    expect(messages.some((message) => message.includes("Copying to"))).toBe(false);
  });

  it("stops at a lost connection while registering, instead of advising YAML mode for every file", async () => {
    const directory = await project();
    const ha = Object.assign(new FakeHomeAssistant(), { dropAt: "lovelace/resources" });
    const warnings: string[] = [];
    await expect(deploy({
      configFile: join(directory, "dashboard.config.mjs"),
      env: settings(directory),
      skipBuild: true,
      report: () => {},
      warn: (message) => warnings.push(message),
      connect: async () => ha,
    })).rejects.toThrowError("Home Assistant closed the connection.");
    expect(warnings).toEqual([]);
    expect(ha.closed).toBe(true);
  });

  it.each(["lovelace/dashboards/create", "lovelace/config/save"])("names the dashboard to delete when the connection is lost at %s", async (dropAt) => {
    const directory = await project();
    const ha = Object.assign(new FakeHomeAssistant(), { dropAt });
    await expect(deploy({
      configFile: join(directory, "dashboard.config.mjs"),
      env: settings(directory),
      skipBuild: true,
      report: () => {},
      warn: () => {},
      connect: async () => ha,
    })).rejects.toThrowError('Home Assistant closed the connection. The "Home A" dashboard (/home-a) may have been created without its layout: if it is in the sidebar, delete it under Settings → Dashboards, then deploy again.');
  });

  it.skipIf(process.platform === "win32")("copies over ssh without blocking, so the open connection keeps answering Home Assistant", async () => {
    const directory = await project();
    const bin = join(directory, "bin");
    await mkdir(bin);
    // A stand-in ssh that takes its time, as one waiting at a prompt does, then runs the remote command here.
    await writeFile(join(bin, "ssh"), '#!/bin/sh\nfor last; do :; done\nsleep 0.4\nexec sh -c "$last"\n');
    await chmod(join(bin, "ssh"), 0o755);
    const path = process.env.PATH;
    process.env.PATH = `${bin}${delimiter}${path}`;
    let ticks = 0;
    const timer = setInterval(() => ticks++, 20);
    try {
      await deploy({
        configFile: join(directory, "dashboard.config.mjs"),
        env: { ...settings(directory), HA_WWW: `root@homeassistant.local:${join(directory, "remote")}` },
        skipBuild: true,
        report: () => {},
        warn: () => {},
        connect: async () => { ticks = 0; return new FakeHomeAssistant(); },
      });
    } finally {
      clearInterval(timer);
      process.env.PATH = path;
    }
    expect(await readFile(join(directory, "remote", "orb-dashboard", "orb-dashboard.js"), "utf8")).toBe("console.log('orb');");
    // A blocked event loop would have let no timer run while ssh slept.
    expect(ticks).toBeGreaterThanOrEqual(5);
  });
});


describe("connectHomeAssistant", () => {
  it("rejects a command sent after Home Assistant closes the connection instead of waiting forever", async () => {
    const server = await startFakeHomeAssistant({ port: 0 });
    try {
      const ha = await connectHomeAssistant(server.settings.HA_URL, server.settings.HA_TOKEN);
      await expect(ha.send("lovelace/dashboards/list")).resolves.toEqual(expect.any(Array));
      await server.close();
      // The first command can't be answered, so it settles once the client has seen the close.
      const lost = { closed: true, message: "Home Assistant closed the connection." };
      await expect(ha.send("lovelace/dashboards/list")).rejects.toMatchObject(lost);
      // The next one is sent on a closed socket, which drops it: only the client can settle it.
      await expect(ha.send("lovelace/config/save")).rejects.toMatchObject(lost);
      ha.close();
    } finally {
      await server.close();
    }
  });
});
