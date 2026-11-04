import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { FakeDashboard, FakeSavedLayout } from "./fake-home-assistant.js";
import type { FakeRegistries, FakeState } from "./house.js";
import { startFakeHomeAssistant } from "./server.js";
import type { FakeHomeAssistantServer, FakeHomeAssistantSettings, StartFakeHomeAssistantOptions } from "./server.js";
import { openWebSocket } from "./test-client.js";
import type { FakeWebSocketClient } from "./test-client.js";

const servers: FakeHomeAssistantServer[] = [];
const clients: FakeWebSocketClient[] = [];
const folders: string[] = [];

async function start(options: StartFakeHomeAssistantOptions = {}) {
  const server = await startFakeHomeAssistant({ port: 0, ...options });
  servers.push(server);
  return server;
}

async function authenticate(settings: FakeHomeAssistantSettings, token = settings.HA_TOKEN) {
  const client = await openWebSocket(`${settings.HA_URL.replace(/^http/, "ws")}/api/websocket`);
  clients.push(client);
  const required = await client.next((message) => message.type === "auth_required");
  expect(required.ha_version).toBe("2026.10.0");
  client.send({ type: "auth", access_token: token });
  const result = await client.next((message) => message.type === "auth_ok" || message.type === "auth_invalid");
  return { client, result };
}

async function ask(client: FakeWebSocketClient, id: number, type: string, payload: Record<string, unknown> = {}) {
  client.send({ id, type, ...payload });
  return client.next((message) => message.id === id && message.type === "result");
}

async function tempDir() {
  const folder = await mkdtemp(join(tmpdir(), "fake-ha-test-"));
  folders.push(folder);
  return folder;
}

afterEach(async () => {
  for (const client of clients.splice(0)) await client.close();
  for (const server of servers.splice(0)) await server.close();
  for (const folder of folders.splice(0)) await rm(folder, { recursive: true, force: true });
});

describe("the websocket API", () => {
  it("authenticates the token and reports the version", async () => {
    const { settings } = await start();
    const { result } = await authenticate(settings);
    expect(result).toMatchObject({ type: "auth_ok", ha_version: "2026.10.0" });
  });

  it("rejects a wrong token", async () => {
    const { settings } = await start();
    const { result } = await authenticate(settings, "wrong");
    expect(result).toMatchObject({ type: "auth_invalid", message: "Invalid access token or password" });
  });

  it("sends the house on subscribe_entities, then one change", async () => {
    const { ha, settings } = await start();
    const { client } = await authenticate(settings);

    expect(await ask(client, 1, "subscribe_entities")).toMatchObject({ success: true, result: null });
    const initial = await client.next((message) => message.id === 1 && message.type === "event" && message.event?.a !== undefined);
    expect(Object.keys(initial.event?.a ?? {})).toHaveLength(16);
    expect(initial.event?.a?.["light.kitchen_ceiling"]).toMatchObject({ s: "on", a: { brightness: 230 }, c: "fake" });

    client.send({ id: 2, type: "call_service", domain: "light", service: "toggle", target: { entity_id: "light.kitchen_ceiling" } });
    const change = await client.next((message) => message.id === 1 && message.type === "event" && message.event?.c !== undefined);
    expect(change.event?.c?.["light.kitchen_ceiling"]?.["+"]).toMatchObject({ s: "off" });
    expect(ha.states["light.kitchen_ceiling"]?.state).toBe("off");
  });

  it("answers the Lovelace resource, dashboard and config commands", async () => {
    const { ha, settings } = await start();
    const { client } = await authenticate(settings);

    expect((await ask(client, 1, "lovelace/resources")).result).toEqual([]);
    expect(await ask(client, 2, "lovelace/resources/create", { url: "/local/x.js", res_type: "module" })).toMatchObject({ success: true, result: null });
    expect(ha.resources).toEqual([{ id: "resource-1", url: "/local/x.js", type: "module" }]);
    await ask(client, 3, "lovelace/resources/update", { resource_id: "resource-1", url: "/local/y.js" });
    expect(ha.resources[0]?.url).toBe("/local/y.js");

    await ask(client, 4, "lovelace/dashboards/create", { url_path: "home-test", title: "Home", icon: "mdi:home" });
    expect(await ask(client, 5, "lovelace/dashboards/create", { url_path: "home-test", title: "Again" })).toMatchObject({
      success: false,
      error: { code: "unknown_command", message: "url_path home-test already exists" },
    });
    await ask(client, 6, "lovelace/dashboards/update", { dashboard_id: "dashboard-1", title: "Renamed" });
    const dashboards = (await ask(client, 7, "lovelace/dashboards/list")).result as FakeDashboard[];
    expect(dashboards).toMatchObject([{ url_path: "home-test", title: "Renamed" }]);

    const config = { views: [{ type: "panel", cards: [{ type: "custom:dashhaus-orb" }] }] };
    await ask(client, 8, "lovelace/config/save", { url_path: "home-test", config });
    const saved = (await ask(client, 9, "lovelace/config", { url_path: "home-test" })).result as FakeSavedLayout["config"];
    expect(saved).toEqual(config);
    expect(await ask(client, 10, "lovelace/config", { url_path: "missing" })).toMatchObject({ success: false, error: { message: "config_not_found" } });
  });

  it("draws a saved dashboard's first card from the fake house", async () => {
    const { settings } = await start();
    const { client } = await authenticate(settings);
    await ask(client, 1, "lovelace/dashboards/create", { url_path: "home-test", title: "Home", icon: "mdi:home" });
    await ask(client, 2, "lovelace/config/save", { url_path: "home-test", config: { views: [{ cards: [{ type: "custom:test-card" }] }] } });

    const page = await fetch(`${settings.HA_URL}/home-test`);
    expect(page.status).toBe(200);
    const html = await page.text();
    expect(html).toContain("custom:test-card");
    expect(html).toContain("light.kitchen_ceiling");
    expect(await (await fetch(`${settings.HA_URL}/`)).text()).toContain("Home");
  });

  it("takes a dashboard page's lovelace commands, as the frontend's websocket would, and nothing else", async () => {
    const { ha, settings } = await start();
    const post = async (message: Record<string, unknown>) =>
      (await (await fetch(`${settings.HA_URL}/api/fake/lovelace`, { method: "POST", body: JSON.stringify(message) })).json()) as { success: boolean; result?: unknown; error?: { code: string; message: string } };
    expect(await post({ type: "lovelace/dashboards/create", url_path: "home-new", title: "New", icon: "mdi:home" })).toMatchObject({ success: true, result: { id: "dashboard-1", url_path: "home-new" } });
    expect(await post({ type: "lovelace/dashboards/list" })).toMatchObject({ success: true, result: [{ url_path: "home-new" }] });
    expect(await post({ type: "lovelace/dashboards/delete", dashboard_id: "missing" })).toMatchObject({ success: false, error: { code: "unknown_command" } });
    expect(await post({ type: "call_service", domain: "light", service: "turn_off", target: { entity_id: "light.kitchen_ceiling" } })).toMatchObject({ success: false });
    expect(ha.states["light.kitchen_ceiling"]?.state).toBe("on");
    expect((await fetch(`${settings.HA_URL}/api/fake/lovelace`)).status).toBe(405);
  });

  it("serves injected states and registries", async () => {
    const states: FakeState[] = [{ entity_id: "light.injected", state: "on", attributes: { friendly_name: "Injected" } }];
    const registries: FakeRegistries = {
      entities: { "light.injected": { entity_id: "light.injected", area_id: "den", device_id: "den_air", hidden: false, entity_category: null } },
      devices: { den_air: { id: "den_air", area_id: "den", name: "den air" } },
      areas: { den: { area_id: "den", name: "Den" } },
    };
    const { settings } = await start({ states, registries });
    const headers = { authorization: `Bearer ${settings.HA_TOKEN}` };
    expect(await (await fetch(`${settings.HA_URL}/api/states`, { headers })).json()).toMatchObject([{ entity_id: "light.injected", state: "on" }]);

    const { client } = await authenticate(settings);
    expect((await ask(client, 1, "get_states")).result).toMatchObject([{ entity_id: "light.injected" }]);
    expect((await ask(client, 2, "config/entity_registry/list_for_display")).result).toEqual({ entity_categories: {}, entities: [{ ei: "light.injected", ai: "den", di: "den_air" }] });
    expect((await ask(client, 3, "config/device_registry/list")).result).toEqual([{ id: "den_air", area_id: "den", name: "den air" }]);
    expect((await ask(client, 4, "config/area_registry/list")).result).toEqual([{ area_id: "den", name: "Den" }]);

    await ask(client, 5, "subscribe_entities");
    const initial = await client.next((message) => message.id === 5 && message.type === "event" && message.event?.a !== undefined);
    expect(Object.keys(initial.event?.a ?? {})).toEqual(["light.injected"]);
  });
});

describe("the HTTP server", () => {
  it("wants the bearer token for the REST reads", async () => {
    const { settings } = await start();
    expect((await fetch(`${settings.HA_URL}/api/states`)).status).toBe(401);

    const headers = { authorization: `Bearer ${settings.HA_TOKEN}` };
    expect(await (await fetch(`${settings.HA_URL}/api/`, { headers })).json()).toEqual({ message: "API running." });
    const config = (await (await fetch(`${settings.HA_URL}/api/config`, { headers })).json()) as { version: string; location_name: string };
    expect(config).toMatchObject({ version: "2026.10.0", location_name: "Fake Home" });

    const states = (await (await fetch(`${settings.HA_URL}/api/states`, { headers })).json()) as FakeState[];
    expect(states).toHaveLength(16);
    const one = (await (await fetch(`${settings.HA_URL}/api/states/light.kitchen_ceiling`, { headers })).json()) as FakeState;
    expect(one).toMatchObject({ entity_id: "light.kitchen_ceiling", state: "on" });
    expect((await fetch(`${settings.HA_URL}/api/states/light.missing`, { headers })).status).toBe(404);
  });

  it("reports what deploy left behind at /api/fake/state", async () => {
    const { ha, settings } = await start();
    await ha.send("lovelace/resources/create", { url: "/local/x.js", res_type: "module" });
    await ha.send("lovelace/dashboards/create", { url_path: "home-test", title: "Home" });

    const dump = (await (await fetch(`${settings.HA_URL}/api/fake/state`)).json()) as {
      resources: Array<{ url: string }>;
      dashboards: FakeDashboard[];
      saved: FakeSavedLayout[];
      calls: string[];
    };
    expect(dump.resources).toMatchObject([{ url: "/local/x.js" }]);
    expect(dump.dashboards).toMatchObject([{ url_path: "home-test" }]);
    expect(dump.saved).toEqual([]);
    expect(dump.calls).toEqual(["lovelace/resources/create", "lovelace/dashboards/create"]);
  });

  it("serves /local and refuses a path outside it", async () => {
    const www = await tempDir();
    await writeFile(join(www, "bundle.js"), "export default 42;\n");
    const { settings } = await start({ www });

    const served = await fetch(`${settings.HA_URL}/local/bundle.js`);
    expect(served.status).toBe(200);
    expect(served.headers.get("content-type")).toBe("text/javascript");
    expect(await served.text()).toBe("export default 42;\n");

    expect((await fetch(`${settings.HA_URL}/local/missing.js`)).status).toBe(404);
    expect((await fetch(`${settings.HA_URL}/local/..%2Fsecret.txt`)).status).toBe(403);
  });

  it("writes the state file after every command", async () => {
    const folder = await tempDir();
    const stateFile = join(folder, "ha.json");
    const { settings } = await start({ stateFile });
    type Dump = {
      resources: Array<{ id: string; url: string; type?: string }>;
      dashboards: unknown[];
      saved: unknown[];
      calls: string[];
    };

    expect(JSON.parse(await readFile(stateFile, "utf8")) as Dump).toEqual({ resources: [], dashboards: [], saved: [], calls: [] });
    const { client } = await authenticate(settings);
    await ask(client, 1, "lovelace/resources/create", { url: "/local/x.js", res_type: "module" });

    const written = JSON.parse(await readFile(stateFile, "utf8")) as Dump;
    expect(written.resources).toEqual([{ id: "resource-1", url: "/local/x.js", type: "module" }]);
    expect(written.calls).toEqual(["lovelace/resources/create"]);
  });

  it("closes without waiting for an open client", async () => {
    const server = await start();
    const { client } = await authenticate(server.settings);
    await ask(client, 1, "subscribe_entities");

    const started = Date.now();
    await server.close();
    expect(Date.now() - started).toBeLessThan(2000);
  });
});
