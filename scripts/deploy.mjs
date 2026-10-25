#!/usr/bin/env node
// npm run deploy — build the Lovelace card, copy it into Home Assistant's www folder, point the dashboard
// resource at the new file, and create the dashboard the first time. Settings come from .env (see
// .env.example). Run again after every change; it never overwrites a dashboard you have edited.
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { copyFile, mkdir, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { autoDashboard, lovelaceDashboard } from "../src/ha/lovelace/auto.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const FILE = "home-dashboard.js";
const FOLDER = "home-dashboard";
const RESOURCE_PATH = `/local/${FOLDER}/${FILE}`;

const args = new Set(process.argv.slice(2));
if (args.has("--help") || args.has("-h")) {
  console.log(`Usage: npm run deploy [-- --skip-build]

Builds dist/${FILE}, copies it to $HA_WWW/${FOLDER}/, registers ${RESOURCE_PATH} as a dashboard
resource (with a version so browsers fetch the new file), and creates the "$HA_DASHBOARD" dashboard
with a generated layout and the "$HA_GLASS_DASHBOARD" glass dashboard if they do not exist yet.
Settings: .env, see .env.example.`);
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
const DASHBOARD = process.env.HA_DASHBOARD || "home-dashboard";
const TITLE = process.env.HA_DASHBOARD_TITLE || "Home";
// "off" skips the glass dashboard.
const GLASS_DASHBOARD = process.env.HA_GLASS_DASHBOARD || "home-glass";
const GLASS_TITLE = process.env.HA_GLASS_DASHBOARD_TITLE || "Glass";

const missing = [
  !HA_URL && "HA_URL      your Home Assistant address, e.g. http://homeassistant.local:8123",
  !HA_TOKEN && "HA_TOKEN    a long-lived access token (Profile → Security → Long-lived access tokens)",
  !HA_WWW && "HA_WWW      where /config/www is: root@homeassistant.local:/config/www over SSH, or a mounted folder",
].filter(Boolean);
if (missing.length) {
  fail(`Missing settings. Copy .env.example to .env and fill in:\n    ${missing.join("\n    ")}`);
}
if (!DASHBOARD.includes("-")) fail(`HA_DASHBOARD must contain a hyphen (Home Assistant requires it): "${DASHBOARD}"`);
if (GLASS_DASHBOARD !== "off" && !GLASS_DASHBOARD.includes("-")) fail(`HA_GLASS_DASHBOARD must contain a hyphen (Home Assistant requires it), or be "off": "${GLASS_DASHBOARD}"`);

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

step(`Checking the "${DASHBOARD}" dashboard`);
const dashboards = await ha.send("lovelace/dashboards/list");
if (dashboards.some((d) => d.url_path === DASHBOARD)) {
  done("exists; its layout is yours and was left alone");
} else {
  const [states, entityRegistry, devices, areas] = await Promise.all([
    ha.send("get_states"),
    ha.send("config/entity_registry/list_for_display").catch(() => undefined),
    ha.send("config/device_registry/list").catch(() => []),
    ha.send("config/area_registry/list").catch(() => []),
  ]);
  const card = autoDashboard({
    states: Object.fromEntries(states.map((s) => [s.entity_id, s])),
    entities: entityRegistryEntries(entityRegistry),
    devices: Object.fromEntries(devices.map((d) => [d.id, { area_id: d.area_id }])),
    areas: Object.fromEntries(areas.map((a) => [a.area_id, { name: a.name }])),
  }, TITLE);
  await ha.send("lovelace/dashboards/create", { url_path: DASHBOARD, title: TITLE, icon: "mdi:home-variant", mode: "storage", show_in_sidebar: true, require_admin: false });
  await ha.send("lovelace/config/save", { url_path: DASHBOARD, config: lovelaceDashboard(card, TITLE) });
  done(`created with ${card.sections?.length ?? 0} generated sections`);
}

if (GLASS_DASHBOARD !== "off") {
  step(`Checking the "${GLASS_DASHBOARD}" glass dashboard`);
  if (dashboards.some((d) => d.url_path === GLASS_DASHBOARD)) {
    done("exists; its layout is yours and was left alone");
  } else {
    // Automatic: without `cards` the card draws every supported entity by area, and keeps up as the house changes.
    await ha.send("lovelace/dashboards/create", { url_path: GLASS_DASHBOARD, title: GLASS_TITLE, icon: "mdi:view-dashboard-variant", mode: "storage", show_in_sidebar: true, require_admin: false });
    await ha.send("lovelace/config/save", { url_path: GLASS_DASHBOARD, config: lovelaceDashboard({ type: "custom:home-dashboard-glass", title: TITLE }, GLASS_TITLE) });
    done("created in automatic mode");
  }
}
ha.close();

console.log(`\nDone. Open ${HA_URL}/${DASHBOARD}/home${GLASS_DASHBOARD !== "off" ? ` or ${HA_URL}/${GLASS_DASHBOARD}/home` : ""} and reload the page once to pick up version ${version}.
To edit it: ⋮ → Edit dashboard → the card's ✎ → Code editor. The format is in docs/deploy.md.`);
process.exit(0);

// ---------- Helpers ----------

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
