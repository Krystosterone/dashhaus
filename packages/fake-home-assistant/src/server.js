/**
 * The fake Home Assistant as a server, with no dependency beyond Node:
 *
 *   fake-home-assistant [--port 8123] [--host 127.0.0.1] [--www <dir>] [--token <token>] [--state <file.json>]
 *
 * It prints the three `.env` settings a person would copy from their own Home Assistant (HA_URL, HA_TOKEN, HA_WWW) and
 * serves:
 *
 *   /api/websocket   Home Assistant's websocket API: auth, `subscribe_entities` (the house, then each change),
 *                    `call_service` (toggles change the house), and `FakeHomeAssistant.send` for every other command
 *   /local/<path>    files under HA_WWW, as Home Assistant serves /config/www
 *   /                the sidebar: every dashboard deploy created
 *   /<url_path>[/<view>]  a dashboard: its registered resources loaded as modules and its saved panel card drawn on the
 *                    fake house, through an in-page connection, so a deployed skin can be looked at and screenshotted
 *   /api/, /api/config, /api/states[/<id>]  the REST reads, with the bearer token
 *   /api/fake/state  what deploy left behind (resources, dashboards, saved layouts, the command log), as JSON
 *
 * `--state` also writes that JSON to a file after every command. The www folder defaults to a new temporary one.
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { mkdtemp } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { extname, join, normalize, resolve, sep } from "node:path";
import { FakeHomeAssistant } from "./fake-home-assistant.js";

/** Start the server; resolves with its settings and a `close()`. */
export async function startFakeHomeAssistant({ port = 8123, host = "127.0.0.1", www, token = "fake-ha-token", stateFile, states, registries } = {}) {
  const ha = new FakeHomeAssistant({ states, registries });
  const folder = resolve(www ?? (await mkdtemp(join(tmpdir(), "fake-ha-www-"))));
  const dump = () => ({
    resources: ha.resources,
    dashboards: ha.dashboards,
    saved: ha.saved,
    calls: ha.calls.map(({ type }) => type),
  });
  const persist = () => {
    if (stateFile) writeFileSync(stateFile, `${JSON.stringify(dump(), null, 2)}\n`);
  };

  const server = createServer((request, response) => {
    const url = new URL(request.url ?? "/", `http://${request.headers.host}`);
    const path = decodeURIComponent(url.pathname);
    if (path === "/favicon.ico") return send(response, 204, "image/x-icon", "");
    if (path.startsWith("/api/") && path !== "/api/fake/state") {
      // The REST API answers what a real one does for a read: a bearer token, then JSON.
      if (request.headers.authorization !== `Bearer ${token}`) return send(response, 401, "text/plain", "401: Unauthorized");
      if (path === "/api/") return send(response, 200, "application/json", JSON.stringify({ message: "API running." }));
      if (path === "/api/config") return send(response, 200, "application/json", JSON.stringify({ version: ha.version, location_name: "Fake Home", unit_system: { temperature: "°C" } }));
      if (path === "/api/states") return send(response, 200, "application/json", JSON.stringify(Object.values(ha.states)));
      const state = path.startsWith("/api/states/") ? ha.states[path.slice("/api/states/".length)] : undefined;
      if (state) return send(response, 200, "application/json", JSON.stringify(state));
      return send(response, 404, "application/json", JSON.stringify({ message: "Entity not found." }));
    }
    if (path === "/api/fake/state") return send(response, 200, "application/json", JSON.stringify(dump(), null, 2));
    if (path.startsWith("/local/")) return serveFile(response, folder, path.slice("/local/".length));
    if (path === "/" || path === "") return send(response, 200, "text/html", sidebar(ha));
    const dashboard = ha.dashboards.find((candidate) => candidate.url_path === path.split("/")[1]);
    if (dashboard) return send(response, 200, "text/html", dashboardPage(ha, dashboard));
    send(response, 404, "text/plain", `Not found: ${path}`);
  });

  server.on("upgrade", (request, socket) => {
    if (!request.url?.startsWith("/api/websocket")) return socket.destroy();
    const key = request.headers["sec-websocket-key"];
    const accept = createHash("sha1").update(`${key}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`).digest("base64");
    socket.write(`HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${accept}\r\n\r\n`);
    const reply = (message) => socket.write(frame(JSON.stringify(message)));
    let authed = false;
    reply({ type: "auth_required", ha_version: ha.version });
    readFrames(socket, async (text) => {
      let message;
      try {
        message = JSON.parse(text);
      } catch {
        return;
      }
      if (!authed) {
        if (message.type === "auth" && message.access_token === token) {
          authed = true;
          reply({ type: "auth_ok", ha_version: ha.version });
        } else {
          reply({ type: "auth_invalid", message: "Invalid access token or password" });
          socket.end();
        }
        return;
      }
      const { id, type, ...payload } = message;
      if (type === "subscribe_entities") {
        // Home Assistant's compressed state stream: the whole house once, then each change.
        reply({ id, type: "result", success: true, result: null });
        reply({ id, type: "event", event: { a: Object.fromEntries(Object.values(ha.states).map((state) => [state.entity_id, compress(state)])) } });
        const stop = ha.onStateChange((state) => reply({ id, type: "event", event: { c: { [state.entity_id]: { "+": compress(state) } } } }));
        socket.on("close", stop);
        return;
      }
      if (type === "subscribe_events" || type === "unsubscribe_events" || type === "ping") {
        reply(type === "ping" ? { id, type: "pong" } : { id, type: "result", success: true, result: null });
        return;
      }
      try {
        const result = await ha.send(type, payload);
        reply({ id, type: "result", success: true, result });
      } catch (error) {
        reply({ id, type: "result", success: false, error: { code: "unknown_command", message: error?.message ?? String(error) } });
      }
      persist();
    });
  });

  // Keep the sockets so `close()` can end a websocket or a keep-alive request instead of waiting for the client.
  const sockets = new Set();
  server.on("connection", (socket) => {
    sockets.add(socket);
    socket.on("close", () => sockets.delete(socket));
  });

  await new Promise((done, fail) => {
    server.once("error", fail);
    server.listen(port, host, done);
  });
  const address = server.address();
  const settings = { HA_URL: `http://${host}:${address.port}`, HA_TOKEN: token, HA_WWW: folder };
  persist();
  let closing;
  const close = () => (closing ??= new Promise((done, fail) => {
    server.close((error) => (error ? fail(error) : done()));
    for (const socket of sockets) socket.destroy();
  }));
  return { ha, settings, close };
}

/** A state as `subscribe_entities` sends it. */
const compress = (state) => ({ s: state.state, a: state.attributes, c: state.context?.id ?? "fake", lc: Date.parse(state.last_changed) / 1000, lu: Date.parse(state.last_updated) / 1000 });

function send(response, status, type, body) {
  response.writeHead(status, { "content-type": `${type}; charset=utf-8`, "cache-control": "no-store" });
  response.end(body);
}

const TYPES = { ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml", ".woff2": "font/woff2" };

function serveFile(response, root, relative) {
  const file = normalize(join(root, relative));
  if (file !== root && !file.startsWith(`${root}${sep}`)) return send(response, 403, "text/plain", "Forbidden");
  if (!existsSync(file) || !statSync(file).isFile()) return send(response, 404, "text/plain", `Not found: /local/${relative}`);
  response.writeHead(200, { "content-type": TYPES[extname(file)] ?? "application/octet-stream", "cache-control": "no-store" });
  response.end(readFileSync(file));
}

/** One unfragmented text frame, server to client (unmasked). */
function frame(text) {
  const body = Buffer.from(text);
  const length = body.length;
  const head = length < 126 ? Buffer.from([0x81, length]) : length < 65536 ? Buffer.from([0x81, 126, length >> 8, length & 255]) : Buffer.concat([Buffer.from([0x81, 127]), bigLength(length)]);
  return Buffer.concat([head, body]);
}

function bigLength(length) {
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64BE(BigInt(length));
  return buffer;
}

/** Read masked client frames (text, close, ping) and hand each complete text message on. */
function readFrames(socket, onText) {
  let buffer = Buffer.alloc(0);
  let pieces = [];
  socket.on("data", (chunk) => {
    buffer = Buffer.concat([buffer, chunk]);
    for (;;) {
      if (buffer.length < 2) return;
      const fin = (buffer[0] & 0x80) !== 0;
      const opcode = buffer[0] & 0x0f;
      const masked = (buffer[1] & 0x80) !== 0;
      let length = buffer[1] & 0x7f;
      let offset = 2;
      if (length === 126) {
        if (buffer.length < 4) return;
        length = buffer.readUInt16BE(2);
        offset = 4;
      } else if (length === 127) {
        if (buffer.length < 10) return;
        length = Number(buffer.readBigUInt64BE(2));
        offset = 10;
      }
      const maskOffset = offset;
      if (masked) offset += 4;
      if (buffer.length < offset + length) return;
      const payload = Buffer.from(buffer.subarray(offset, offset + length));
      if (masked) for (let i = 0; i < payload.length; i++) payload[i] ^= buffer[maskOffset + (i % 4)];
      buffer = buffer.subarray(offset + length);
      if (opcode === 0x8) {
        socket.end(Buffer.from([0x88, 0]));
        return;
      }
      if (opcode === 0x9) {
        socket.write(Buffer.concat([Buffer.from([0x8a, payload.length]), payload]));
        continue;
      }
      if (opcode === 0x1 || opcode === 0x0) {
        pieces.push(payload);
        if (fin) {
          const text = Buffer.concat(pieces).toString("utf8");
          pieces = [];
          void onText(text);
        }
      }
    }
  });
  socket.on("error", () => undefined);
}

const escape = (value) => String(value).replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char]);

function sidebar(ha) {
  const items = ha.dashboards.map((dashboard) => `<li><a href="/${escape(dashboard.url_path)}">${escape(dashboard.title)}</a> <code>/${escape(dashboard.url_path)}</code></li>`).join("");
  return `<!doctype html><meta charset="utf-8"><title>Fake Home Assistant</title>
<h1>Fake Home Assistant ${escape(ha.version)}</h1>
<p>Resources: ${ha.resources.map((resource) => `<code>${escape(resource.url)}</code>`).join(", ") || "none"}</p>
<ul>${items || "<li>No dashboards yet. Run dashhaus-deploy.</li>"}</ul>`;
}

/**
 * A dashboard as the frontend would draw a panel view: every module resource loaded, then the view's first card
 * created, configured and handed a `hass` whose connection answers `subscribe_entities` from the fake house and
 * applies `light/switch` toggles, so a press on a deployed card changes it.
 */
function dashboardPage(ha, dashboard) {
  const saved = ha.saved.find((entry) => entry.url_path === dashboard.url_path)?.config;
  const card = saved?.views?.[0]?.cards?.[0];
  const data = JSON.stringify({ card, resources: ha.resources.map((resource) => resource.url), states: Object.values(ha.states), registries: ha.registries, version: ha.version }).replace(/</g, "\\u003c");
  return `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escape(dashboard.title)} – Fake Home Assistant</title>
<style>html,body{margin:0;min-height:100%;background:#fafafa}#view{min-height:100vh}#problem{font:14px/1.5 system-ui;margin:16px;padding:16px;border:1px solid #c00;white-space:pre-wrap}</style>
</head><body><div id="view"></div>
<script type="module">
const data = ${data};
const view = document.getElementById("view");
const fail = (message) => { const box = document.createElement("pre"); box.id = "problem"; box.textContent = message; view.replaceChildren(box); window.__fakeHaProblem = message; };
const states = Object.fromEntries(data.states.map((state) => [state.entity_id, state]));
const listeners = new Set();
const events = new Map();
const compress = (state) => ({ s: state.state, a: state.attributes, c: state.context.id, lc: Date.parse(state.last_changed) / 1000 });
const connection = {
  haVersion: data.version,
  connected: true,
  addEventListener(name, fn) { if (!events.has(name)) events.set(name, new Set()); events.get(name).add(fn); },
  removeEventListener(name, fn) { events.get(name)?.delete(fn); },
  async subscribeMessage(callback, message) {
    if (message.type === "subscribe_entities") {
      listeners.add(callback);
      queueMicrotask(() => callback({ a: Object.fromEntries(Object.values(states).map((state) => [state.entity_id, compress(state)])) }));
      return async () => listeners.delete(callback);
    }
    return async () => undefined;
  },
  async sendMessagePromise(message) {
    window.__fakeHaCalls = [...(window.__fakeHaCalls ?? []), message];
    if (message.type === "get_states") return Object.values(states);
    if (message.type === "call_service") {
      const id = message.target?.entity_id ?? message.service_data?.entity_id;
      const state = states[id];
      if (!state) throw { code: "not_found", message: "Entity " + id + " not found" };
      const next = message.service === "turn_on" ? "on" : message.service === "turn_off" ? "off" : message.service === "toggle" ? (state.state === "on" ? "off" : "on") : state.state;
      const attributes = { ...state.attributes, ...(message.service_data?.brightness != null ? { brightness: message.service_data.brightness } : {}) };
      if (message.service_data?.brightness_pct != null) attributes.brightness = Math.round(message.service_data.brightness_pct * 2.55);
      states[id] = { ...state, state: next, attributes, last_changed: new Date().toISOString() };
      for (const listener of listeners) listener({ c: { [id]: { "+": { s: next, a: attributes, lc: Date.now() / 1000 } } } });
      return { context: { id: "fake" } };
    }
    if (message.type.startsWith("history/")) return {};
    if (message.type.startsWith("recorder/")) return {};
    return null;
  },
  close() {},
};
const hass = () => ({ connection, states: { ...states }, ...data.registries, themes: { darkMode: false }, panels: {} });
try {
  if (!data.card) throw new Error("This dashboard has no saved card.");
  for (const url of data.resources) await import(url);
  const tag = String(data.card.type ?? "").replace(/^custom:/, "");
  if (!tag || !String(data.card.type).startsWith("custom:")) throw new Error("The saved card's type is not a custom card: " + data.card.type);
  await Promise.race([customElements.whenDefined(tag), new Promise((_, reject) => setTimeout(() => reject(new Error("Custom element doesn't exist: " + tag + ". No registered resource defined it.")), 4000))]);
  const element = document.createElement(tag);
  element.setConfig(data.card);
  element.hass = hass();
  view.append(element);
  window.__fakeHaReady = true;
} catch (error) {
  fail("Configuration error\\n" + (error?.message ?? String(error)));
}
</script></body></html>`;
}
