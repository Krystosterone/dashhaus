// The deploy CLI's work: read the user's config, build and upload its files, register each as a dashboard resource
// and create the dashboards once. Node-only: it imports no @dashhaus package and no skin. Settings are the only thing it
// reads from the environment; the config names the dashboards.
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { copyFile, mkdir, readFile, rename } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { DeployConfigError, panelView, readConfig, resolveDashboards, resolveFiles } from "./load.js";

export { DeployConfigError, loadDashboards, readConfig, resolveDashboards, resolveFiles } from "./load.js";

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
    throw new DeployConfigError(`Missing settings. Put them in .env beside the config (or the environment):\n    ${missing.join("\n    ")}\nRun dashhaus-deploy --help for a whole .env.`);
  }
  return { url, token, www, sshPort: env.HA_SSH_PORT ? String(env.HA_SSH_PORT) : undefined };
}

/** Run the config's build callback once, with the config's directory as the working directory. */
async function runBuild({ config, configFile, skipBuild, report }) {
  if (skipBuild || !config.build) return;
  report("\n→ Running the config's build");
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

/** Read one file the config names, with its content hash as the version its resource URL carries. */
async function readTarget({ configFile, target, report }) {
  let contents;
  try {
    contents = await readFile(target.file);
  } catch {
    throw new DeployConfigError(`${target.file} is missing; run without --skip-build or add a build() to the config.`);
  }
  const version = createHash("sha256").update(contents).digest("hex").slice(0, 10);
  const shown = relative(dirname(configFile), target.file) || target.file;
  report(`  ✓ ${shown} (${Math.round(contents.length / 1024)} kB, version ${version})`);
  return { ...target, contents, version };
}

/**
 * Copy one file to Home Assistant's www folder: over SSH for `user@host:/path`, or into a mounted folder (a Windows
 * drive, `Z:\www`, is a folder). It lands under a temporary name and is renamed into place, so a copy cut off halfway
 * leaves the file Home Assistant serves as it was.
 */
async function upload({ contents, target, www, sshPort, configFile, report }) {
  const remote = /^[A-Za-z]:[\\/]/.test(www) ? null : /^(?:[^@/\s]+@)?[^:/\s]+:(.+)$/.exec(www);
  if (remote) {
    const host = www.slice(0, www.length - remote[1].length - 1);
    const dir = `${remote[1].replace(/\/+$/, "")}/${target.folder}`;
    const port = sshPort ? ["-p", sshPort] : [];
    const quoted = (path) => `'${path.replaceAll("'", "'\\''")}'`;
    report(`\n→ Copying to ${www}/${target.folder}/`);
    // Streamed over plain ssh rather than scp: the Home Assistant SSH add-ons do not all offer SFTP. Run without
    // blocking, so the open websocket keeps answering Home Assistant's heartbeat while ssh waits at a prompt.
    const status = await new Promise((done) => {
      const ssh = spawn("ssh", [...port, host, `mkdir -p ${quoted(dir)} && cat > ${quoted(`${dir}/${target.name}.tmp`)} && mv ${quoted(`${dir}/${target.name}.tmp`)} ${quoted(`${dir}/${target.name}`)}`], { stdio: ["pipe", "inherit", "inherit"] });
      ssh.on("error", () => done(null));
      ssh.on("close", done);
      ssh.stdin.on("error", () => {}); // ssh that exits early stops reading; its status says why.
      ssh.stdin.end(contents);
    });
    if (status !== 0) {
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
  await copyFile(target.file, join(folder, `${target.name}.tmp`));
  await rename(join(folder, `${target.name}.tmp`), join(folder, target.name));
  report(`  ✓ ${target.folder}/${target.name}`);
}

/** Point a file's dashboard resource at its new version, the content hash. */
async function registerResource(ha, target, report, warn) {
  const { name, version } = target;
  const url = `${target.resourcePath}?v=${version}`;
  try {
    const resources = await ha.send("lovelace/resources");
    const existing = resources.find((resource) => resource.url.split("?")[0] === target.resourcePath);
    if (existing) await ha.send("lovelace/resources/update", { resource_id: existing.id, res_type: "module", url });
    else await ha.send("lovelace/resources/create", { res_type: "module", url });
    report(`  ✓ ${url} ${existing ? "(updated)" : "(added)"}`);
    // The same file from elsewhere (a Marketplace install's /hacsfiles/…) defines the same cards: whichever loads
    // first wins, and the other is skipped without a word.
    const other = resources.find((resource) => resource.url.split("?")[0] !== target.resourcePath && resource.url.split("?")[0].endsWith(`/${target.name}`));
    if (other) warn(`  ! Another ${target.name} is also registered (${other.url.split("?")[0]}). Both define the same cards and only the first to load is used, so remove one under Settings → Dashboards → Resources.`);
    return { name, url, version, updated: Boolean(existing) };
  } catch (error) {
    // A lost connection is not YAML mode: stop rather than advise a resource for every file.
    if (error?.closed) throw error;
    const message = error?.message ?? String(error);
    warn(`  ! Could not manage resources (${message}). If your dashboards are in YAML mode, add this under lovelace: resources: in configuration.yaml:
      - url: ${url}
        type: module`);
    return { name, url, version, updated: false, error: message };
  }
}

/**
 * The config a new dashboard is saved with: a skin's strategy as `{ strategy }`, so the skin draws it on every load,
 * or a card in one panel view, from its factory or as written.
 */
async function layoutOf(dashboard, ha, pageTitle) {
  if (dashboard.strategy) return { config: { strategy: dashboard.strategy }, made: `the ${dashboard.strategy.type} strategy` };
  if (typeof dashboard.card === "function") {
    const { card, made } = await dashboard.card(ha);
    return { config: panelView(card, pageTitle), made };
  }
  return { config: panelView(dashboard.card, pageTitle), made: "your card" };
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
    const { config, made } = await layoutOf(dashboard, ha, pageTitle);
    // A connection lost around the create or the save may leave the dashboard without its layout for good, since the
    // next run keeps an existing one: say which to delete. Home Assistant may have stored either before the close.
    const leftBehind = (error) => new Error(`${error?.message ?? String(error)} The "${dashboard.title}" dashboard (/${dashboard.path}) may have been created without its layout: if it is in the sidebar, delete it under Settings → Dashboards, then deploy again.`, { cause: error });
    try {
      await ha.send("lovelace/dashboards/create", { url_path: dashboard.path, title: dashboard.title, icon: dashboard.icon, mode: "storage", show_in_sidebar: true, require_admin: false });
    } catch (error) {
      throw error?.closed ? leftBehind(error) : error;
    }
    try {
      await ha.send("lovelace/config/save", { url_path: dashboard.path, config });
    } catch (error) {
      // Delete what this run created, so the next run creates it again rather than leaving it empty for good. The
      // save's error is the one worth reporting; when the rollback can't run either (Home Assistant restarted), the
      // error says which dashboard to delete.
      const rolledBack = await ha.send("lovelace/dashboards/list")
        .then(async (list) => {
          const made = list.find((item) => item.url_path === dashboard.path);
          if (made) await ha.send("lovelace/dashboards/delete", { dashboard_id: made.id });
        })
        .then(() => true, () => false);
      throw rolledBack ? error : leftBehind(error);
    }
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
  // A test that fakes the websocket fakes this HTTP check too, or leaves it out.
  fetch = connect === connectHomeAssistant ? globalThis.fetch : undefined,
} = {}) {
  if (!configFile) throw new DeployConfigError("the deploy CLI needs a config file");
  const file = resolve(configFile);
  const config = await readConfig(file);
  const { dashboards, pageTitle } = resolveDashboards(config, env);
  const targets = resolveFiles(config, file);
  const settings = settingsFrom(env);
  await runBuild({ config, configFile: file, skipBuild, report });
  report(`\n→ Reading ${targets.length === 1 ? "the file" : `the ${targets.length} files`}`);
  const files = [];
  for (const target of targets) files.push(await readTarget({ configFile: file, target, report }));

  // Connect before copying anything: a rejected token must leave the served file and its resource's version as they were.
  report(`\n→ Connecting to ${settings.url}`);
  const ha = await connect(settings.url, settings.token);
  try {
    report(`  ✓ Home Assistant ${ha.version}`);
    for (const target of files) await upload({ contents: target.contents, target, www: settings.www, sshPort: settings.sshPort, configFile: file, report });
    report(`\n→ Registering ${files.length === 1 ? "the dashboard resource" : "the dashboard resources"}`);
    const resources = [];
    for (const target of files) resources.push(await registerResource(ha, target, report, warn));
    const results = await reconcileDashboards(ha, dashboards, pageTitle, report);
    if (fetch) report(`\n→ Checking that Home Assistant serves ${files.length === 1 ? "it" : "them"}`);
    for (const target of files) await checkServed({ fetch, url: settings.url, target, www: settings.www, report, warn });
    const versions = files.map((target) => `${target.name} version ${target.version}`).join(", ");
    const open = dashboards.length
      ? `Open ${dashboards.map((dashboard) => `${settings.url}/${dashboard.path}`).join(" or ")} and reload the page once`
      : "Reload any open Home Assistant tab once";
    const edit = dashboards.some((dashboard) => !dashboard.strategy)
      ? "\nTo change a card dashboard's layout: ⋮ → Edit dashboard → the card's ✎ → Show code editor. A mistake is listed with its path and a suggestion."
      : "";
    report(`\nDone. ${open} to pick up ${versions}.${edit}`);
    return { resources, dashboards: results };
  } finally {
    ha.close();
  }
}

/**
 * Fetch the registered file the way the browser will, from Home Assistant's `/local/`, and compare it with what was
 * uploaded. A file that is missing or different means HA_WWW is not the folder Home Assistant serves, which is
 * otherwise only visible as a "Custom element doesn't exist" on the dashboard.
 */
async function checkServed({ fetch, url, target, www, report, warn }) {
  if (!fetch) return;
  const { contents } = target;
  const address = `${url}${target.resourcePath}?v=${target.version}`;
  let response;
  try {
    response = await fetch(address, { cache: "no-store" });
  } catch (error) {
    warn(`  ! Could not fetch ${address}: ${error?.message ?? String(error)}`);
    return;
  }
  if (!response.ok) {
    warn(`  ! ${address} answers HTTP ${response.status}. HA_WWW (${www}) must be the folder Home Assistant serves as /local/, its /config/www.
    If that folder did not exist when Home Assistant started, restart Home Assistant once so /local/ is served.`);
    return;
  }
  const served = Buffer.from(await response.arrayBuffer());
  if (!served.equals(contents)) {
    warn(`  ! ${address} serves a different file (${Math.round(served.length / 1024)} kB) than the one uploaded. Is HA_WWW Home Assistant's /config/www?`);
    return;
  }
  report(`  ✓ ${address} (${Math.round(served.length / 1024)} kB, the uploaded file)`);
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
    // A command that fails because the connection is gone says so with `closed`, apart from an error Home Assistant
    // answers with.
    const closed = () => Object.assign(new Error("Home Assistant closed the connection."), { closed: true });
    const rejectPending = (error) => {
      for (const { rej } of pending.values()) rej(error);
      pending.clear();
    };
    const client = {
      get version() { return version; },
      send(type, payload = {}) {
        // A closed WebSocket drops send() without a word, so a request after a close would wait forever.
        if (socket.readyState !== WebSocket.OPEN) return Promise.reject(closed());
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
      if (!settled) rejectConnection(new Error(`Could not reach ${base}. Is HA_URL right?`));
      rejectPending(closed());
    });
    socket.addEventListener("close", () => {
      if (!settled) rejectConnection(new Error(`Could not reach ${base}. Is HA_URL right?`));
      rejectPending(closed());
    });
  });
}
