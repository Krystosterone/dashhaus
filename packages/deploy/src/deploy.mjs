// The deploy CLI's work: read the user's config, build and upload its bundle, register the dashboard resource and
// create the dashboards once. Node-only: it imports no @dashhaus package and no skin. Settings are the only thing it
// reads from the environment; the config names the dashboards.
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { copyFile, mkdir, readFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { DeployConfigError, panelView, readConfig, resolveBundle, resolveDashboards } from "./load.mjs";

export { DeployConfigError, loadDashboards, readConfig, resolveBundle, resolveDashboards } from "./load.mjs";

/** The settings `.env` (or the environment) must carry; the config never holds a secret. */
function settingsFrom(env) {
  const url = typeof env.HA_URL === "string" ? env.HA_URL.replace(/\/+$/, "") : "";
  const token = typeof env.HA_TOKEN === "string" ? env.HA_TOKEN : "";
  const www = typeof env.HA_WWW === "string" ? env.HA_WWW : "";
  const missing = [
    !url && "HA_URL      your Home Assistant address, e.g. http://homeassistant.local:8123",
    !token && "HA_TOKEN    a long-lived access token (Profile → Security → Long-lived access tokens)",
    !www && "HA_WWW      where /config/www is: root@homeassistant.local:/config/www over SSH, or a mounted folder",
  ].filter(Boolean);
  if (missing.length) {
    throw new DeployConfigError(`Missing settings. Copy .env.example to .env beside the config and fill in:\n    ${missing.join("\n    ")}`);
  }
  return { url, token, www, sshPort: env.HA_SSH_PORT ? String(env.HA_SSH_PORT) : undefined };
}

/** Run the config's build callback with the config's directory as the working directory, then read its bundle. */
async function readBundle({ config, configFile, target, skipBuild, report }) {
  if (!skipBuild && config.build) {
    report("\n→ Building the dashboard bundle");
    const previous = process.cwd();
    process.chdir(dirname(configFile));
    try {
      await config.build();
    } catch (error) {
      throw new DeployConfigError(`The build failed: ${error?.message ?? String(error)}`);
    } finally {
      process.chdir(previous);
    }
  }
  let contents;
  try {
    contents = await readFile(target.file);
  } catch {
    throw new DeployConfigError(`${target.file} is missing; run without --skip-build or add a build() to the config.`);
  }
  const version = createHash("sha256").update(contents).digest("hex").slice(0, 10);
  const shown = relative(dirname(configFile), target.file) || target.file;
  report(`  ✓ ${shown} (${Math.round(contents.length / 1024)} kB, version ${version})`);
  return { contents, version };
}

/** Copy the bundle to Home Assistant's www folder: over SSH for `user@host:/path`, or into a mounted folder. */
async function upload({ contents, target, www, sshPort, configFile, report }) {
  const remote = /^(?:[^@/\s]+@)?[^:/\s]+:(.+)$/.exec(www);
  if (remote) {
    const host = www.slice(0, www.length - remote[1].length - 1);
    const dir = `${remote[1].replace(/\/+$/, "")}/${target.folder}`;
    const port = sshPort ? ["-p", sshPort] : [];
    const quoted = (path) => `'${path.replaceAll("'", "'\\''")}'`;
    report(`\n→ Copying to ${www}/${target.folder}/`);
    // Streamed over plain ssh rather than scp: the Home Assistant SSH add-ons do not all offer SFTP.
    const ssh = spawnSync("ssh", [...port, host, `mkdir -p ${quoted(dir)} && cat > ${quoted(`${dir}/${target.name}`)}`], { input: contents, stdio: ["pipe", "inherit", "inherit"] });
    if (ssh.status !== 0) {
      throw new DeployConfigError(`Copying over SSH to ${host} failed. Check that the SSH add-on is running and that \`ssh ${[...port, host].join(" ")}\` works without a password prompt.`);
    }
    report(`  ✓ ${target.folder}/${target.name}`);
    return;
  }
  const directory = resolve(dirname(configFile), www);
  report(`\n→ Copying to ${directory}/${target.folder}/`);
  if (!existsSync(directory)) {
    throw new DeployConfigError(`${www} does not exist. Mount Home Assistant's config share (Samba add-on) or use user@host:/config/www.`);
  }
  const folder = join(directory, target.folder);
  await mkdir(folder, { recursive: true });
  await copyFile(target.file, join(folder, target.name));
  report(`  ✓ ${target.folder}/${target.name}`);
}

/** Point the dashboard resource at the new file, with the content hash as its version. */
async function registerResource(ha, target, version, report, warn) {
  report("\n→ Registering the dashboard resource");
  const url = `${target.resourcePath}?v=${version}`;
  try {
    const resources = await ha.send("lovelace/resources");
    const existing = resources.find((resource) => resource.url.split("?")[0] === target.resourcePath);
    if (existing) await ha.send("lovelace/resources/update", { resource_id: existing.id, res_type: "module", url });
    else await ha.send("lovelace/resources/create", { res_type: "module", url });
    report(`  ✓ ${url} ${existing ? "(updated)" : "(added)"}`);
    return { url, updated: Boolean(existing) };
  } catch (error) {
    const message = error?.message ?? String(error);
    warn(`  ! Could not manage resources (${message}). If your dashboards are in YAML mode, add this under lovelace: resources: in configuration.yaml:
      - url: ${url}
        type: module`);
    return { url, updated: false, error: message };
  }
}

/** Create each dashboard whose layout does not exist yet; an existing one keeps its layout and follows a title change. */
async function reconcileDashboards(ha, dashboards, pageTitle, report) {
  const existingDashboards = await ha.send("lovelace/dashboards/list");
  const results = [];
  for (const dashboard of dashboards) {
    report(`\n→ Checking the "${dashboard.title}" dashboard (/${dashboard.path})`);
    const existing = existingDashboards.find((candidate) => candidate.url_path === dashboard.path);
    if (existing) {
      const renamed = existing.title !== dashboard.title;
      if (renamed) {
        await ha.send("lovelace/dashboards/update", { dashboard_id: existing.id, title: dashboard.title });
        report(`  ✓ exists; renamed "${existing.title}" → "${dashboard.title}", its layout is yours and was left alone`);
      } else {
        report("  ✓ exists; its layout is yours and was left alone");
      }
      results.push({ path: dashboard.path, title: dashboard.title, status: "existing", renamed });
      continue;
    }
    const { card, made } = await dashboard.card(ha);
    await ha.send("lovelace/dashboards/create", { url_path: dashboard.path, title: dashboard.title, icon: dashboard.icon, mode: "storage", show_in_sidebar: true, require_admin: false });
    await ha.send("lovelace/config/save", { url_path: dashboard.path, config: panelView(card, pageTitle) });
    report(`  ✓ created with ${made}`);
    results.push({ path: dashboard.path, title: dashboard.title, status: "created" });
  }
  return results;
}

/**
 * The whole deploy. `connect` is injectable so the fake-Home-Assistant test runs the real build, upload and
 * reconciliation without a network; it returns a client with `send`, `version` and `close`.
 */
export async function deploy({
  configFile,
  env = process.env,
  skipBuild = false,
  report = console.log,
  warn = console.warn,
  connect = connectHomeAssistant,
} = {}) {
  if (!configFile) throw new DeployConfigError("the deploy CLI needs a config file");
  const file = resolve(configFile);
  const config = await readConfig(file);
  const { dashboards, pageTitle } = resolveDashboards(config, env);
  const target = resolveBundle(config, file);
  const settings = settingsFrom(env);
  const { contents, version } = await readBundle({ config, configFile: file, target, skipBuild, report });
  await upload({ contents, target, www: settings.www, sshPort: settings.sshPort, configFile: file, report });

  report(`\n→ Connecting to ${settings.url}`);
  const ha = await connect(settings.url, settings.token);
  try {
    report(`  ✓ Home Assistant ${ha.version}`);
    const resource = await registerResource(ha, target, version, report, warn);
    const results = await reconcileDashboards(ha, dashboards, pageTitle, report);
    report(`\nDone. Open ${dashboards.map((dashboard) => `${settings.url}/${dashboard.path}/home`).join(" or ")} and reload the page once to pick up version ${version}.
To edit one: ⋮ → Edit dashboard → the card's ✎ → Code editor. The formats are in spec/deploy.md.`);
    return { version, resource, dashboards: results };
  } finally {
    ha.close();
  }
}

/**
 * A minimal Home Assistant websocket client: authenticate, then send commands and await their results. The CLI is
 * Node-only, so it uses Node's built-in WebSocket.
 */
export function connectHomeAssistant(base, token) {
  return new Promise((resolveConnection, rejectConnection) => {
    const socket = new WebSocket(`${base.replace(/^http/, "ws")}/api/websocket`);
    const pending = new Map();
    let id = 0;
    let version = "";
    let settled = false;
    const rejectPending = (error) => {
      for (const { rej } of pending.values()) rej(error);
      pending.clear();
    };
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
        settled = true;
        resolveConnection(client);
      } else if (message.type === "auth_invalid") {
        settled = true;
        rejectConnection(new Error("Home Assistant rejected HA_TOKEN. Create a new long-lived access token."));
        socket.close();
      } else if (message.type === "result") {
        const call = pending.get(message.id);
        pending.delete(message.id);
        if (message.success) call?.res(message.result);
        else call?.rej(new Error(message.error?.message ?? "request failed"));
      }
    });
    socket.addEventListener("error", () => {
      const error = new Error(`Could not reach ${base}. Is HA_URL right?`);
      if (!settled) rejectConnection(error);
      rejectPending(error);
    });
    socket.addEventListener("close", () => {
      if (!settled) rejectConnection(new Error(`Could not reach ${base}. Is HA_URL right?`));
      rejectPending(new Error("Home Assistant closed the connection."));
    });
  });
}
