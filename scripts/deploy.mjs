#!/usr/bin/env node
// npm run deploy — build the Lovelace cards' bundle, copy it into Home Assistant's www folder, point the dashboard
// resource at the new file, and create one dashboard per skin the first time. Settings come from .env (see
// .env.example). Run again after every change; it never overwrites a dashboard layout you have edited.
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { copyFile, mkdir, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { autoDashboard, lovelaceDashboard } from "../src/skins/orb/lovelace/auto.ts";
import { GENERATED_SKINS } from "./generated-skins.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const FILE = "home-dashboard.js";
const FOLDER = "home-dashboard";
const RESOURCE_PATH = `/local/${FOLDER}/${FILE}`;

const args = new Set(process.argv.slice(2));
if (args.has("--help") || args.has("-h")) {
  console.log(`Usage: npm run deploy [-- --skip-build]

Builds dist/${FILE}, copies it to $HA_WWW/${FOLDER}/, registers ${RESOURCE_PATH} as a dashboard
resource (with a version so browsers fetch the new file), and creates the Orb ("$HA_DASHBOARD"),
Field ("$HA_FIELD_DASHBOARD") and generated-skin dashboards with automatic layouts if they do not
exist yet. Settings: .env, see .env.example.`);
  process.exit(0);
}

const step = (text) => console.log(`\n→ ${text}`);
const done = (text) => console.log(`  ✓ ${text}`);
function fail(text) {
  console.error(`\n✗ ${text}`);
  process.exit(1);
}

// ---------- Settings ----------
const envFile = join(root, ".env");
if (existsSync(envFile)) process.loadEnvFile(envFile);
const HA_URL = process.env.HA_URL?.replace(/\/+$/, "");
const HA_TOKEN = process.env.HA_TOKEN;
const HA_WWW = process.env.HA_WWW;
const HA_SSH_PORT = process.env.HA_SSH_PORT;
// The page title each card prints in its header; the sidebar titles below tell the two dashboards apart.
const PAGE_TITLE = "Home";
// One dashboard per skin. Orb's layout is generated from the house once, to edit; Field's card, given no
// modules, lays the house out itself every time it draws.
const DASHBOARDS = [
  {
    path: process.env.HA_DASHBOARD || "home-dashboard",
    title: process.env.HA_DASHBOARD_TITLE || "Home (Orb)",
    icon: "mdi:home-variant",
    async card(ha) {
      const card = autoDashboard(await house(ha), PAGE_TITLE);
      return { card, made: `${card.sections?.length ?? 0} generated sections` };
    },
  },
  {
    path: process.env.HA_FIELD_DASHBOARD || "home-dashboard-field",
    title: process.env.HA_FIELD_DASHBOARD_TITLE || "Home (Field)",
    icon: "mdi:knob",
    async card() {
      return { card: { type: "custom:home-dashboard-field", title: PAGE_TITLE }, made: "every light and climate entity by area" };
    },
  },
  ...GENERATED_SKINS.map(({ id, title, icon }) => ({
    path: `home-dashboard-${id}`,
    title,
    icon,
    async card() {
      return { card: { type: `custom:home-dashboard-${id}`, title: PAGE_TITLE }, made: `the ${id} skin's automatic layout` };
    },
  })),
];

const missing = [
  !HA_URL && "HA_URL      your Home Assistant address, e.g. http://homeassistant.local:8123",
  !HA_TOKEN && "HA_TOKEN    a long-lived access token (Profile → Security → Long-lived access tokens)",
  !HA_WWW && "HA_WWW      where /config/www is: root@homeassistant.local:/config/www over SSH, or a mounted folder",
].filter(Boolean);
if (missing.length) {
  fail(`Missing settings. Copy .env.example to .env and fill in:\n    ${missing.join("\n    ")}`);
}
for (const { path } of DASHBOARDS) {
  if (!path.includes("-")) fail(`dashboard paths must contain a hyphen (Home Assistant requires it): "${path}"`);
}
const duplicatePaths = DASHBOARDS.map((dashboard) => dashboard.path).filter((path, i, paths) => paths.indexOf(path) !== i);
if (duplicatePaths.length) fail(`dashboard paths must be unique: ${duplicatePaths.join(", ")}`);

// ---------- Build ----------
const bundle = join(root, "dist", FILE);
if (!args.has("--skip-build")) {
  step("Building the card");
  const build = spawnSync("npx", ["vite", "build", "-c", "vite.lovelace.config.ts", "--logLevel", "warn"], { cwd: root, stdio: "inherit" });
  if (build.status !== 0) fail("The build failed.");
}
if (!existsSync(bundle)) fail(`${bundle} is missing; run without --skip-build.`);
const contents = await readFile(bundle);
const version = createHash("sha256").update(contents).digest("hex").slice(0, 10);
done(`dist/${FILE} (${Math.round(contents.length / 1024)} kB, version ${version})`);

// ---------- Upload ----------
// "user@host:/path" (or "host:/path") goes over SSH; anything else is a folder on this machine.
const remote = /^(?:[^@/\s]+@)?[^:/\s]+:(.+)$/.exec(HA_WWW);
step(`Copying to ${HA_WWW}/${FOLDER}/`);
if (remote) {
  const host = HA_WWW.slice(0, HA_WWW.length - remote[1].length - 1);
  const dir = `${remote[1].replace(/\/+$/, "")}/${FOLDER}`;
  const port = HA_SSH_PORT ? ["-p", HA_SSH_PORT] : [];
  // Streamed over plain ssh rather than scp: the Home Assistant SSH add-ons do not all offer SFTP.
  const quoted = (path) => `'${path.replaceAll("'", "'\\''")}'`;
  const ssh = spawnSync("ssh", [...port, host, `mkdir -p ${quoted(dir)} && cat > ${quoted(`${dir}/${FILE}`)}`], { input: contents, stdio: ["pipe", "inherit", "inherit"] });
  if (ssh.status !== 0) fail(`Copying over SSH to ${host} failed. Check that the SSH add-on is running and that \`ssh ${[...port, host].join(" ")}\` works without a password prompt.`);
} else {
  const dir = join(resolve(root, HA_WWW), FOLDER);
  if (!existsSync(resolve(root, HA_WWW))) fail(`${HA_WWW} does not exist. Mount Home Assistant's config share (Samba add-on) or use user@host:/config/www.`);
  await mkdir(dir, { recursive: true });
  await copyFile(bundle, join(dir, FILE));
}
done(`${FOLDER}/${FILE}`);

// ---------- Home Assistant ----------
step(`Connecting to ${HA_URL}`);
const ha = await connect(HA_URL, HA_TOKEN);
done(`Home Assistant ${ha.version}`);

step("Registering the dashboard resource");
const url = `${RESOURCE_PATH}?v=${version}`;
try {
  const resources = await ha.send("lovelace/resources");
  const existing = resources.find((r) => r.url.split("?")[0] === RESOURCE_PATH);
  if (existing) await ha.send("lovelace/resources/update", { resource_id: existing.id, res_type: "module", url });
  else await ha.send("lovelace/resources/create", { res_type: "module", url });
  done(`${url} ${existing ? "(updated)" : "(added)"}`);
} catch (error) {
  console.warn(`  ! Could not manage resources (${error.message}). If your dashboards are in YAML mode, add this under lovelace: resources: in configuration.yaml:
      - url: ${url}
        type: module`);
}

const dashboards = await ha.send("lovelace/dashboards/list");
for (const dashboard of DASHBOARDS) {
  step(`Checking the "${dashboard.title}" dashboard (/${dashboard.path})`);
  const existing = dashboards.find((d) => d.url_path === dashboard.path);
  if (existing) {
    // The sidebar title follows .env; the layout is never touched.
    if (existing.title !== dashboard.title) {
      await ha.send("lovelace/dashboards/update", { dashboard_id: existing.id, title: dashboard.title });
      done(`exists; renamed "${existing.title}" → "${dashboard.title}", its layout is yours and was left alone`);
    } else {
      done("exists; its layout is yours and was left alone");
    }
    continue;
  }
  const { card, made } = await dashboard.card(ha);
  await ha.send("lovelace/dashboards/create", { url_path: dashboard.path, title: dashboard.title, icon: dashboard.icon, mode: "storage", show_in_sidebar: true, require_admin: false });
  await ha.send("lovelace/config/save", { url_path: dashboard.path, config: lovelaceDashboard(card, PAGE_TITLE) });
  done(`created with ${made}`);
}
ha.close();

console.log(`\nDone. Open ${DASHBOARDS.map((d) => `${HA_URL}/${d.path}/home`).join(" or ")} and reload the page once to pick up version ${version}.
To edit one: ⋮ → Edit dashboard → the card's ✎ → Code editor. The formats are in docs/deploy.md.`);
process.exit(0);

// ---------- Helpers ----------

/** The house as `autoDashboard` reads it: states and the entity, device and area registries. */
async function house(ha) {
  const [states, entityRegistry, devices, areas] = await Promise.all([
    ha.send("get_states"),
    ha.send("config/entity_registry/list_for_display").catch(() => undefined),
    ha.send("config/device_registry/list").catch(() => []),
    ha.send("config/area_registry/list").catch(() => []),
  ]);
  return {
    states: Object.fromEntries(states.map((s) => [s.entity_id, s])),
    entities: entityRegistryEntries(entityRegistry),
    devices: Object.fromEntries(devices.map((d) => [d.id, { area_id: d.area_id }])),
    areas: Object.fromEntries(areas.map((a) => [a.area_id, { name: a.name }])),
  };
}

/** `config/entity_registry/list_for_display` → the frontend's `hass.entities` shape. */
function entityRegistryEntries(response) {
  if (!response?.entities) return undefined;
  const categories = response.entity_categories ?? {};
  return Object.fromEntries(response.entities.map((e) => [e.ei, {
    device_id: e.di,
    area_id: e.ai,
    hidden: e.hb === true,
    entity_category: e.ec === undefined ? undefined : categories[e.ec] ?? "other",
  }]));
}

/** A minimal Home Assistant websocket client: authenticate, then send commands and await their results. */
function connect(base, token) {
  return new Promise((resolveConnection, rejectConnection) => {
    const socket = new WebSocket(`${base.replace(/^http/, "ws")}/api/websocket`);
    const pending = new Map();
    let id = 0;
    let version = "";
    const client = {
      get version() { return version; },
      send(type, payload = {}) {
        const request = ++id;
        socket.send(JSON.stringify({ id: request, type, ...payload }));
        return new Promise((res, rej) => pending.set(request, { res, rej }));
      },
      close() { socket.close(); },
    };
    socket.addEventListener("message", (event) => {
      const message = JSON.parse(String(event.data));
      if (message.type === "auth_required") {
        version = message.ha_version;
        socket.send(JSON.stringify({ type: "auth", access_token: token }));
      } else if (message.type === "auth_ok") {
        resolveConnection(client);
      } else if (message.type === "auth_invalid") {
        rejectConnection(new Error("Home Assistant rejected HA_TOKEN. Create a new long-lived access token."));
      } else if (message.type === "result") {
        const call = pending.get(message.id);
        pending.delete(message.id);
        if (message.success) call?.res(message.result);
        else call?.rej(new Error(message.error?.message ?? "request failed"));
      }
    });
    socket.addEventListener("error", () => rejectConnection(new Error(`Could not reach ${base}. Is HA_URL right?`)));
  }).catch((error) => fail(error.message));
}
