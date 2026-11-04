import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SETUP_DASHBOARDS } from "./dashboards";
import { NOT_ADMIN, YAML_MODE, defineSetupCard, provision } from "./setup";
import type { SetupDashboard, SetupHass } from "./setup";

type Message = { type: string } & Record<string, unknown>;

/** The Lovelace dashboard commands as Home Assistant answers them, with a switch to fail one. */
function fakeConnection(initial: string[] = [], fail: Partial<Record<string, unknown>> = {}) {
  const dashboards = initial.map((path, index) => ({ id: `existing-${index}`, url_path: path }));
  const saved: Record<string, unknown> = {};
  const sent: Message[] = [];
  let next = 0;
  const connection = {
    async sendMessagePromise<T>(message: Message): Promise<T> {
      sent.push(message);
      if (message.type in fail) throw fail[message.type];
      if (message.type === "lovelace/dashboards/list") return dashboards.map((item) => ({ ...item })) as T;
      if (message.type === "lovelace/dashboards/create") {
        const item = { id: `created-${++next}`, url_path: String(message.url_path) };
        dashboards.push(item);
        return item as T;
      }
      if (message.type === "lovelace/config/save") {
        saved[String(message.url_path)] = message.config;
        return null as T;
      }
      if (message.type === "lovelace/dashboards/delete") {
        dashboards.splice(dashboards.findIndex((item) => item.id === message.dashboard_id), 1);
        return null as T;
      }
      throw { code: "unknown_command", message: `Unknown command ${message.type}` };
    },
  };
  return { connection, dashboards, saved, sent, types: () => sent.map((message) => message.type) };
}

const ORB: SetupDashboard = { path: "setup-orb", title: "Home (Orb)", icon: "mdi:home-variant", type: "custom:setup-test-orb" };
const FIELD: SetupDashboard = { path: "setup-field", title: "Home (Field)", icon: "mdi:knob", type: "custom:setup-test-field" };
const BOTH = [ORB, FIELD];
const all = new Set(BOTH.map((dashboard) => dashboard.path));

const hassOf = (connection: SetupHass["connection"], admin = true): SetupHass => ({ connection, user: { is_admin: admin } });

describe("provision", () => {
  it("creates every missing dashboard with one panel view holding its skin's card, on its automatic layout", async () => {
    const ha = fakeConnection();
    const results = await provision(hassOf(ha.connection), BOTH, all, "Flat");
    expect(results.map((entry) => entry.status)).toEqual(["created", "created"]);
    expect(ha.sent.find((message) => message.type === "lovelace/dashboards/create")).toEqual({
      type: "lovelace/dashboards/create",
      url_path: "setup-orb",
      title: "Home (Orb)",
      icon: "mdi:home-variant",
      mode: "storage",
      show_in_sidebar: true,
      require_admin: false,
    });
    // The same panel view the deploy CLI saves (its test pins the same shape), so both installs end alike.
    const panel = (type: string) => ({ views: [{ title: "Flat", path: "home", type: "panel", cards: [{ type, title: "Flat" }] }] });
    expect(ha.saved["setup-orb"]).toEqual(panel("custom:setup-test-orb"));
    expect(ha.saved["setup-field"]).toEqual(panel("custom:setup-test-field"));
  });

  it("leaves an existing dashboard alone: no rename, no save, no delete", async () => {
    const ha = fakeConnection(["setup-orb"]);
    const results = await provision(hassOf(ha.connection), BOTH, all);
    expect(results.map((entry) => entry.status)).toEqual(["existing", "created"]);
    expect(ha.sent.filter((message) => message.url_path === "setup-orb" || message.dashboard_id === "existing-0")).toEqual([]);
  });

  it("creates only the dashboards a person kept checked", async () => {
    const ha = fakeConnection();
    const results = await provision(hassOf(ha.connection), BOTH, new Set(["setup-field"]));
    expect(results.map((entry) => entry.status)).toEqual(["skipped", "created"]);
    expect(Object.keys(ha.saved)).toEqual(["setup-field"]);
  });

  it("is idempotent: a second press lists the dashboards and sends nothing else", async () => {
    const ha = fakeConnection();
    await provision(hassOf(ha.connection), BOTH, all);
    ha.sent.length = 0;
    const again = await provision(hassOf(ha.connection), BOTH, all);
    expect(again.map((entry) => entry.status)).toEqual(["existing", "existing"]);
    expect(ha.types()).toEqual(["lovelace/dashboards/list"]);
  });

  it("deletes a dashboard it just created when saving its layout fails, and carries on with the next", async () => {
    let saves = 0;
    const ha = fakeConnection();
    const save = ha.connection.sendMessagePromise.bind(ha.connection);
    ha.connection.sendMessagePromise = async <T>(message: Message) => {
      if (message.type === "lovelace/config/save" && saves++ === 0) {
        ha.sent.push(message);
        throw { code: "home_assistant_error", message: "Disk full" };
      }
      return save<T>(message);
    };
    const results = await provision(hassOf(ha.connection), BOTH, all);
    expect(results).toEqual([
      { path: "setup-orb", title: "Home (Orb)", status: "failed", error: "Disk full" },
      { path: "setup-field", title: "Home (Field)", status: "created" },
    ]);
    expect(ha.sent).toContainEqual({ type: "lovelace/dashboards/delete", dashboard_id: "created-1" });
    expect(ha.dashboards.map((item) => item.url_path)).toEqual(["setup-field"]);
  });

  it("finds the dashboard to roll back by its path when create answers without one", async () => {
    const ha = fakeConnection();
    const send = ha.connection.sendMessagePromise.bind(ha.connection);
    ha.connection.sendMessagePromise = async <T>(message: Message) => {
      const answer = await send<T>(message.type === "lovelace/config/save" ? { ...message, type: "fail" } : message).catch((error) => {
        throw message.type === "lovelace/config/save" ? new Error("Saving failed") : error;
      });
      return (message.type === "lovelace/dashboards/create" ? null : answer) as T;
    };
    const [orb] = await provision(hassOf(ha.connection), [ORB], all);
    expect(orb).toMatchObject({ status: "failed", error: "Saving failed" });
    expect(ha.sent).toContainEqual({ type: "lovelace/dashboards/delete", dashboard_id: "created-1" });
  });

  it("sends nothing for a person who is not an administrator", async () => {
    const ha = fakeConnection();
    const results = await provision(hassOf(ha.connection, false), BOTH, new Set(["setup-orb"]));
    expect(results).toEqual([
      { path: "setup-orb", title: "Home (Orb)", status: "failed", error: NOT_ADMIN },
      { path: "setup-field", title: "Home (Field)", status: "skipped" },
    ]);
    expect(ha.sent).toEqual([]);
  });

  it("says what to do when the dashboards are managed in YAML or the user is refused", async () => {
    const yaml = fakeConnection([], { "lovelace/dashboards/list": { code: "unknown_command", message: "Unknown command." } });
    expect((await provision(hassOf(yaml.connection), [ORB], all))[0]).toMatchObject({ status: "failed", error: YAML_MODE });
    const refused = fakeConnection([], { "lovelace/dashboards/create": { code: "unauthorized", message: "Unauthorized" } });
    expect((await provision(hassOf(refused.connection), [ORB], all))[0]).toMatchObject({ status: "failed", error: NOT_ADMIN });
    expect(refused.types()).not.toContain("lovelace/config/save");
  });
});

describe("SETUP_DASHBOARDS", () => {
  it("offers the dashboards dashboard.config.mjs deploys, with the same paths, titles and icons", () => {
    const config = readFileSync(join(process.cwd(), "dashboard.config.mjs"), "utf8");
    for (const { path, title, icon, type } of SETUP_DASHBOARDS.slice(0, 2)) {
      expect(config).toMatch(new RegExp(`path: "${path}",\\s*title: "${title.replace(/[()]/g, "\\$&")}",\\s*icon: "${icon}"`));
      expect(type).toBe(`custom:${path}`);
    }
  });
});

describe("custom:dashhaus-setup", () => {
  defineSetupCard(BOTH, "Flat");
  const mount = async (ha: ReturnType<typeof fakeConnection>, admin = true) => {
    const element = document.createElement("dashhaus-setup") as HTMLElement & { hass: SetupHass; setConfig(config: unknown): void };
    element.setConfig({ type: "custom:dashhaus-setup" });
    document.body.append(element);
    element.hass = hassOf(ha.connection, admin);
    await vi.waitFor(() => expect(element.shadowRoot!.querySelectorAll("input")).toHaveLength(admin ? 2 : 0));
    return element.shadowRoot!;
  };

  afterEach(() => document.body.replaceChildren());

  it("lists the dashboards, greys out one that is there, and creates the rest on a press", async () => {
    const ha = fakeConnection(["setup-orb"]);
    const root = await mount(ha);
    await vi.waitFor(() => expect(root.querySelector<HTMLInputElement>("input[value=setup-orb]")!.disabled).toBe(true));
    expect(root.querySelector<HTMLInputElement>("input[value=setup-field]")!.checked).toBe(true);
    root.querySelector("button")!.click();
    await vi.waitFor(() => expect(root.querySelector("[role=status]")!.textContent).toMatch(/^Done\./));
    expect(root.querySelector<HTMLAnchorElement>("a[href='/setup-field']")!.textContent).toBe("Open Home (Field)");
    expect(Object.keys(ha.saved)).toEqual(["setup-field"]);
    expect(root.querySelector("button")!.disabled).toBe(true);
  });

  it("creates nothing for a box a person unchecked", async () => {
    const ha = fakeConnection();
    const root = await mount(ha);
    await vi.waitFor(() => expect(ha.types()).toContain("lovelace/dashboards/list"));
    const field = root.querySelector<HTMLInputElement>("input[value=setup-field]")!;
    field.click();
    root.querySelector("button")!.click();
    await vi.waitFor(() => expect(root.querySelector("[role=status]")!.textContent).toMatch(/^Done\./));
    expect(Object.keys(ha.saved)).toEqual(["setup-orb"]);
    expect(root.querySelector<HTMLInputElement>("input[value=setup-field]")!.checked).toBe(false);
  });

  it("tells a person who is not an administrator why, and sends nothing", async () => {
    const ha = fakeConnection();
    const root = await mount(ha, false);
    expect(root.querySelector("[role=alert]")!.textContent).toBe(NOT_ADMIN);
    expect(root.querySelector("button")).toBeNull();
    expect(ha.sent).toEqual([]);
  });

  it("reports a dashboard it could not create, by name, as an alert", async () => {
    const ha = fakeConnection([], { "lovelace/dashboards/create": { code: "home_assistant_error", message: "No room" } });
    const root = await mount(ha);
    root.querySelector("button")!.click();
    await vi.waitFor(() => expect(root.querySelectorAll("li[role=alert]")).toHaveLength(2));
    expect(root.querySelector("li[role=alert]")!.textContent).toBe("Home (Orb): Not created. No room");
    expect(root.querySelector("[role=status]")!.textContent).toBe("2 dashboards were not created; see below.");
  });

  it("is in the card picker as Dashhaus setup", () => {
    expect(window.customCards).toContainEqual(expect.objectContaining({ type: "dashhaus-setup", name: "Dashhaus setup" }));
  });
});
