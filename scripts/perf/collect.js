/**
 * Measure the deployed dashboards in a real browser, against the live Home Assistant.
 *
 * The bundle's opt-in marks (`@dashhaus/core/perf`) are combined with the browser's navigation, paint,
 * long-task and resource entries. For each skin it measures a cold load, opening a card's details, and one
 * reversible control action; it restores the entity to the state it found. The report is JSON, one file per
 * run, so two runs can be compared.
 *
 * Run from a fresh worktree after `npm install` and `npm run deploy`:
 *   npm run perf:collect
 * Settings come from `.env` beside `dashboard.config.mjs` (HA_URL, HA_TOKEN, and any dashboard path overrides).
 * The token is used for the browser's frontend session and for the restore service call; it is never printed or
 * written to the report.
 */
/* global document, window, XMLHttpRequest */
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { chromiumLaunchOptions } from "../chromium.js";
import { connectHomeAssistant, loadDashboards } from "@dashhaus/deploy";

const root = fileURLToPath(new URL("../../", import.meta.url));
const VIEWPORT = { width: 1440, height: 1000 };
const CONFIG = join(root, "dashboard.config.mjs");
const ENV = join(root, ".env");
const DEFAULT_ENTITY = "input_boolean.do_not_disturb";

function usage() {
  return `Usage: npm run perf:collect [-- options]

Measures both deployed dashboards against the live Home Assistant and writes one JSON report.

Options:
  --orb <path>       Orb dashboard path (default: the first dashboard in dashboard.config.mjs)
  --field <path>     Field dashboard path (default: the second dashboard)
  --entity <id>      Reversible control to toggle (default: ${DEFAULT_ENTITY}; input_boolean.* or switch.*)
  --card <name>      The card's printed name, when it differs from the entity's friendly name
  --out <file>       Report path (default: perf/reports/run-<timestamp>.json)
  --headed           Show the browser instead of running headless
  --help             Print this help

Settings: HA_URL and HA_TOKEN in .env or the environment. Deploy the instrumented bundle first.
`;
}

function parseArgs(argv) {
  const options = { headed: false, help: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const value = () => {
      const next = argv[++i];
      if (!next) throw new Error(`${arg} needs a value`);
      return next;
    };
    if (arg === "--help" || arg === "-h") options.help = true;
    else if (arg === "--headed") options.headed = true;
    else if (arg === "--orb") options.orb = value();
    else if (arg === "--field") options.field = value();
    else if (arg === "--entity") options.entity = value();
    else if (arg === "--card") options.card = value();
    else if (arg === "--out") options.out = value();
    else if (arg.startsWith("--") && arg.includes("=")) {
      const [key, ...rest] = arg.split("=");
      const joined = rest.join("=");
      if (key === "--orb") options.orb = joined;
      else if (key === "--field") options.field = joined;
      else if (key === "--entity") options.entity = joined;
      else if (key === "--card") options.card = joined;
      else if (key === "--out") options.out = joined;
      else throw new Error(`Unknown option "${key}". Run --help.`);
    } else throw new Error(`Unknown option "${arg}". Run --help.`);
  }
  return options;
}

const round = (value) => (typeof value === "number" && Number.isFinite(value) ? Math.round(value * 10) / 10 : null);
const delta = (from, to) => (from && to ? round(to.at - from.at) : null);
const firstMark = (marks, name) => marks.find((mark) => mark.name === name);
const escapePattern = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function git(...args) {
  try {
    return execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

/** A shape that lets Playwright wait for cards inside the dashboards' shadow roots. */
const countCardsInPage = () => {
  const count = (root) => {
    let total = root.querySelectorAll("article").length;
    for (const element of root.querySelectorAll("*")) {
      if (element.shadowRoot) total += count(element.shadowRoot);
    }
    return total;
  };
  return count(document);
};

const noDialogsInPage = () => {
  const count = (root) => {
    let total = root.querySelectorAll("dialog[open]").length;
    for (const element of root.querySelectorAll("*")) {
      if (element.shadowRoot) total += count(element.shadowRoot);
    }
    return total;
  };
  return count(document) === 0;
};

async function createContext(browser, { token, origin, enabled }) {
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 1,
    colorScheme: "dark",
  });
  await context.addInitScript(({ token, origin, enabled }) => {
    // The opt-in must add nothing to an off page. Record what the bundle itself registers or fetches,
    // by checking the call stack, so Home Assistant's own pointer listeners and requests do not count.
    const fromBundle = () => {
      const stack = new Error().stack ?? "";
      return stack.includes("/local/") && stack.includes("dashhaus");
    };
    window.__perfProbe = { pointerdown: [], fetches: [] };
    const addListener = EventTarget.prototype.addEventListener;
    EventTarget.prototype.addEventListener = function (type, listener, options) {
      if (type === "pointerdown" && fromBundle()) {
        window.__perfProbe.pointerdown.push({
          target: this === window ? "window" : this === document ? "document" : this?.tagName?.toLowerCase() ?? "other",
          capture: typeof options === "object" ? options?.capture === true : options === true,
          passive: typeof options === "object" ? options?.passive === true : false,
        });
      }
      return addListener.call(this, type, listener, options);
    };
    const request = window.fetch;
    if (request) {
      window.fetch = function (...args) {
        if (fromBundle()) window.__perfProbe.fetches.push(typeof args[0] === "string" ? args[0] : args[0]?.url ?? "?");
        return request.apply(this, args);
      };
    }
    const open = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function (method, url, ...rest) {
      if (fromBundle()) window.__perfProbe.fetches.push(String(url));
      return open.call(this, method, url, ...rest);
    };
    try {
      localStorage.setItem("hassTokens", JSON.stringify({
        access_token: token,
        token_type: "Bearer",
        expires_in: 315360000,
        refresh_token: "",
        hassUrl: origin,
        clientId: `${origin}/`,
        expires: Date.now() + 315360000000,
      }));
      if (enabled) localStorage.setItem("dashhaus:perf", "1");
      else localStorage.removeItem("dashhaus:perf");
    } catch {
      // An unavailable storage is not an opt-in; the page will ask for a login and fail loudly.
    }
    window.__perfBrowser = { lcp: [], longTasks: [], paints: [] };
    try {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          window.__perfBrowser.lcp.push({
            startTime: entry.startTime,
            size: entry.size,
            tag: entry.element?.tagName?.toLowerCase() ?? null,
          });
        }
      }).observe({ type: "largest-contentful-paint", buffered: true });
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          window.__perfBrowser.longTasks.push({ startTime: entry.startTime, duration: entry.duration });
        }
      }).observe({ type: "longtask", buffered: true });
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          window.__perfBrowser.paints.push({ name: entry.name, startTime: entry.startTime });
        }
      }).observe({ type: "paint", buffered: true });
    } catch {
      // The observers are collector-side context; a browser without them still has navigation timing.
    }
  }, { token, origin, enabled });
  return context;
}

function watchPage(page) {
  const errors = { console: 0, page: 0 };
  page.on("console", (message) => {
    if (message.type() === "error") errors.console += 1;
  });
  page.on("pageerror", () => {
    errors.page += 1;
  });
  return errors;
}

async function readMarks(page) {
  return page.evaluate(() => window.__dashhausPerf?.marks ?? []);
}

async function readBrowser(page) {
  return page.evaluate(() => {
    const navigation = performance.getEntriesByType("navigation")[0];
    const paints = performance.getEntriesByType("paint");
    const resources = performance.getEntriesByType("resource");
    const memory = performance.memory;
    const observed = window.__perfBrowser ?? { lcp: [], longTasks: [], paints: [] };
    return {
      navigation: navigation && {
        ttfbMs: navigation.responseStart,
        responseEndMs: navigation.responseEnd,
        domContentLoadedMs: navigation.domContentLoadedEventEnd,
        loadMs: navigation.loadEventEnd,
        durationMs: navigation.duration,
        transferSize: navigation.transferSize,
        encodedBodySize: navigation.encodedBodySize,
        decodedBodySize: navigation.decodedBodySize,
      },
      paints: paints.map((paint) => ({ name: paint.name, startTime: paint.startTime })),
      lcp: observed.lcp,
      longTasks: observed.longTasks,
      resources: resources
        .filter((resource) => ["script", "link", "css", "font", "fetch"].includes(resource.initiatorType))
        .map((resource) => ({
          name: resource.name,
          initiatorType: resource.initiatorType,
          startTime: resource.startTime,
          durationMs: resource.duration,
          transferSize: resource.transferSize,
          encodedBodySize: resource.encodedBodySize,
        })),
      memory: memory && { usedJSHeapSize: memory.usedJSHeapSize, totalJSHeapSize: memory.totalJSHeapSize },
    };
  });
}

async function readDom(page) {
  return page.evaluate(() => {
    const walk = (root, selector) => {
      const found = [...root.querySelectorAll(selector)];
      for (const element of root.querySelectorAll("*")) {
        if (element.shadowRoot) found.push(...walk(element.shadowRoot, selector));
      }
      return found;
    };
    return {
      cards: walk(document, "article").length,
      hosts: walk(document, "dashhaus-orb, dashhaus-field").length,
      dialogs: walk(document, "dialog[open]").length,
    };
  });
}

async function waitForCards(page, timeout = 90_000) {
  await page.waitForFunction(countCardsInPage, null, { timeout });
}

function assertAuthenticated(page) {
  if (new URL(page.url()).pathname.startsWith("/auth/")) {
    throw new Error("Home Assistant redirected to its login page; check HA_TOKEN.");
  }
}

async function waitForState(ha, entity, predicate, timeout = 8_000) {
  const deadline = Date.now() + timeout;
  let last;
  while (Date.now() < deadline) {
    const states = await ha.send("get_states");
    last = states.find((state) => state.entity_id === entity);
    if (last && predicate(last)) return last;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Timed out waiting for ${entity} (last state: ${last?.state ?? "missing"})`);
}

function safeDomain(entity) {
  return entity.startsWith("input_boolean.") || entity.startsWith("switch.");
}

async function setState(ha, entity, state) {
  const domain = entity.slice(0, entity.indexOf("."));
  await ha.send("call_service", {
    domain,
    service: state === "on" ? "turn_on" : "turn_off",
    service_data: { entity_id: entity },
  });
}

function summarizeBrowser(browser) {
  const navigation = browser.navigation;
  const paint = (name) => browser.paints.find((entry) => entry.name === name)?.startTime ?? null;
  const lcp = browser.lcp.at(-1);
  const longTasks = browser.longTasks;
  const longTotal = longTasks.reduce((total, task) => total + task.duration, 0);
  const longMax = longTasks.reduce((max, task) => Math.max(max, task.duration), 0);
  return {
    ttfbMs: round(navigation?.ttfbMs),
    domContentLoadedMs: round(navigation?.domContentLoadedMs),
    loadMs: round(navigation?.loadMs),
    firstPaintMs: round(paint("first-paint")),
    firstContentfulPaintMs: round(paint("first-contentful-paint")),
    largestContentfulPaintMs: round(lcp?.startTime),
    largestContentfulPaintTag: lcp?.tag ?? null,
    longTasks: { count: longTasks.length, totalMs: round(longTotal), maxMs: round(longMax) },
    navigationTransferSize: navigation?.transferSize ?? null,
    jsHeapUsedBytes: browser.memory?.usedJSHeapSize ?? null,
  };
}

function summarizeMarks(marks) {
  const marksByName = {
    bundleEntryMs: firstMark(marks, "bundle:entry")?.at ?? null,
    elementConnectedMs: firstMark(marks, "element:connected")?.at ?? null,
    storeCreatedMs: firstMark(marks, "store:created")?.at ?? null,
    storeConnectedMs: firstMark(marks, "store:connected")?.at ?? null,
    hassReadyMs: firstMark(marks, "hass:ready")?.at ?? null,
    configParsedMs: firstMark(marks, "config:parsed")?.at ?? null,
    renderStartMs: firstMark(marks, "render:start")?.at ?? null,
    renderPaintedMs: firstMark(marks, "render:painted")?.at ?? null,
    storePaintedMs: firstMark(marks, "store:painted")?.at ?? null,
  };
  const connected = firstMark(marks, "element:connected");
  const painted = firstMark(marks, "render:painted");
  const store = firstMark(marks, "store:connected");
  const ready = firstMark(marks, "store:painted");
  return {
    marks: Object.fromEntries(Object.entries(marksByName).map(([key, value]) => [key, round(value)])),
    timings: {
      entryToConnectedMs: delta(firstMark(marks, "bundle:entry"), connected),
      connectedToPaintedMs: delta(connected, painted),
      entryToPaintedMs: delta(firstMark(marks, "bundle:entry"), painted),
      framePaintToStoreConnectedMs: delta(painted, store),
      navigationToPaintedMs: round(painted?.at),
      connectedToReadyMs: delta(connected, ready),
      entryToReadyMs: delta(firstMark(marks, "bundle:entry"), ready),
      storeToReadyMs: delta(store, ready),
      navigationToReadyMs: round(ready?.at),
    },
  };
}

async function runSkin(browser, skin, { path, base, token, origin, entity, cardName, ha }) {
  const context = await createContext(browser, { token, origin, enabled: true });
  const page = await context.newPage();
  const errors = watchPage(page);
  const url = `${base}/${path.replace(/^\/+/, "")}?dashhaus_perf=1`;
  try {
    const cdp = await context.newCDPSession(page);
    await cdp.send("Network.enable");
    await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });

    await page.goto(url, { waitUntil: "domcontentloaded" });
    assertAuthenticated(page);
    try {
      await page.waitForFunction(() => window.__dashhausPerf?.marks?.some((mark) => mark.name === "store:painted"), null, { timeout: 90_000 });
    } catch {
      throw new Error(`No data-ready performance mark from ${url}. Deploy the instrumented bundle with npm run deploy.`);
    }
    await waitForCards(page);
    await page.waitForTimeout(300);

    // Prove the off check's probe is not vacuous: the opt-in page must show the listener it looks for,
    // and the bundle must still make no fetch of its own.
    const probe = await page.evaluate(() => window.__perfProbe ?? { pointerdown: [], fetches: [] });
    // React's event delegation also registers pointerdown listeners from inside the bundle; the opt-in's
    // one is the window capture listener it installs, so judge only that signature.
    const optInListeners = probe.pointerdown.filter((entry) => entry.target === "window" && entry.capture && entry.passive).length;
    if (optInListeners === 0) {
      throw new Error("The performance probe saw no opt-in pointerdown listener; the off check cannot prove absence.");
    }
    if (probe.fetches.length > 0) {
      throw new Error(`The dashhaus bundle fetched ${probe.fetches[0]}${probe.fetches.length > 1 ? " and more" : ""}; the opt-in must not add requests.`);
    }

    const loadMarks = await readMarks(page);
    const browserTimings = await readBrowser(page);
    const dom = await readDom(page);
    const card = page.getByRole("article", { name: cardName, exact: true }).first();
    await card.waitFor({ state: "visible", timeout: 30_000 });

    const coldLoad = {
      dashboard: path,
      url,
      browser: summarizeBrowser(browserTimings),
      ...summarizeMarks(loadMarks),
      cards: dom.cards,
      hosts: dom.hosts,
      probe: { pointerdownListeners: optInListeners, fetches: probe.fetches.length },
      bundle: (() => {
        const resource = browserTimings.resources.find((entry) => entry.name.includes("/local/") && entry.name.includes("dashhaus"));
        return resource && {
          url: resource.name,
          initiatorType: resource.initiatorType,
          durationMs: round(resource.durationMs),
          transferSize: resource.transferSize,
        };
      })(),
      resources: browserTimings.resources
        .filter((entry) => entry.initiatorType === "script" || entry.initiatorType === "font")
        .map((entry) => ({
          name: entry.name,
          initiatorType: entry.initiatorType,
          startTimeMs: round(entry.startTime),
          durationMs: round(entry.durationMs),
          transferSize: entry.transferSize,
        }))
        .slice(0, 30),
    };

    // Details: press the card's name, wait for the dialog's first painted frame.
    const beforeDetails = loadMarks.filter((mark) => mark.name === "details:visible").length;
    await card.getByRole("button", { name: `${cardName} details`, exact: true }).click({ timeout: 10_000 });
    await page.waitForFunction(
      (before) => (window.__dashhausPerf?.marks.filter((mark) => mark.name === "details:visible").length ?? 0) > before,
      beforeDetails,
      { timeout: 10_000 },
    );
    await page.waitForTimeout(100);
    const detailMarks = await readMarks(page);
    const visible = detailMarks.filter((mark) => mark.name === "details:visible").at(-1);
    const request = detailMarks.filter((mark) => mark.name === "details:request").at(-1);
    if (!visible || !request) throw new Error(`No details request/visible marks from ${url}.`);
    if (visible.detail?.label !== `${cardName} details`) {
      throw new Error(`The details mark names "${visible.detail?.label}", not "${cardName} details".`);
    }
    const press = detailMarks
      .filter((mark) => mark.name === "input:pointerdown" && mark.at <= request.at)
      .at(-1);
    const details = {
      target: cardName,
      trigger: "name",
      inputMs: round(press?.at),
      requestMs: round(request.at),
      visibleMs: round(visible.at),
      inputToVisibleMs: press ? round(visible.at - press.at) : null,
      requestToVisibleMs: round(visible.at - request.at),
      dialogOpen: (await readDom(page)).dialogs > 0,
    };

    await page.keyboard.press("Escape");
    await page
      .waitForFunction(noDialogsInPage, null, { timeout: 5_000 })
      .catch(() => {});
    await page.waitForTimeout(100);

    // One reversible action: the card's own control, then restore what Home Assistant had.
    const initial = await latestState(ha, entity);
    if (initial.state !== "on" && initial.state !== "off") {
      throw new Error(`${entity} is ${initial.state}, not a controllable on/off entity.`);
    }
    let after;
    let interaction;
    let interactionError;
    try {
      const startCount = (await readMarks(page)).filter((mark) => mark.name === "action:start").length;
      const control = skin === "orb"
        ? card.getByRole("button", { name: new RegExp(`^${escapePattern(cardName)}:`) })
        : card.getByRole("button", { name: cardName, exact: true });
      await control.click({ timeout: 10_000 });
      await page.waitForFunction(
        (before) => (window.__dashhausPerf?.marks.filter((mark) => mark.name === "action:start").length ?? 0) > before,
        startCount,
        { timeout: 10_000 },
      );
      try {
        await page.waitForFunction(
          () => window.__dashhausPerf?.marks?.some((mark) => mark.name === "action:settled"),
          null,
          { timeout: 10_000 },
        );
      } catch {
        const current = await latestState(ha, entity);
        throw new Error(`${entity} did not settle after the press (state: ${current.state}); check the browser console.`);
      }
      after = await waitForState(ha, entity, (state) => state.state !== initial.state);
      await page.waitForTimeout(100);

      const marks = await readMarks(page);
      const start = marks.filter((mark) => mark.name === "action:start").at(-1);
      if (!start?.detail?.seq) throw new Error(`No action start mark from ${url}.`);
      const seq = start.detail.seq;
      const actionMarks = marks.filter((mark) => mark.detail?.seq === seq);
      const mark = (name) => actionMarks.find((entry) => entry.name === name);
      const ack = mark("action:ack");
      const state = mark("action:state");
      const settled = mark("action:settled");
      const input = marks
        .filter((entry) => entry.name === "input:pointerdown" && entry.at <= start.at)
        .at(-1);
      const action = {
        seq,
        label: start.detail.label ?? null,
        inputMs: round(input?.at),
        startMs: round(start.at),
        ackMs: round(ack?.at),
        stateMs: round(state?.at),
        settledMs: round(settled?.at),
        startToAckMs: ack ? round(ack.at - start.at) : null,
        ackToStateMs: ack && state ? round(state.at - ack.at) : null,
        stateToSettledMs: state && settled ? round(settled.at - state.at) : null,
        inputToSettledMs: input && settled ? round(settled.at - input.at) : null,
        startToSettledMs: settled ? round(settled.at - start.at) : null,
      };
      interaction = {
        entity,
        card: cardName,
        control: skin === "orb" ? "toggle pill" : "key",
        before: initial.state,
        after: after.state,
        action,
      };
    } catch (error) {
      interactionError = error;
    } finally {
      // Always put the house back, whether or not the measurement completed.
      await setState(ha, entity, initial.state);
      await waitForState(ha, entity, (state) => state.state === initial.state);
    }
    if (interactionError) throw interactionError;
    const restored = await latestState(ha, entity);

    return {
      dashboard: path,
      url,
      coldLoad,
      details,
      interaction: { ...interaction, restored: restored.state },
      errors,
    };
  } finally {
    await context.close();
  }
}

async function latestState(ha, entity) {
  const states = await ha.send("get_states");
  const state = states.find((entry) => entry.entity_id === entity);
  if (!state) throw new Error(`Home Assistant has no entity ${entity}.`);
  return state;
}

async function offCheck(browser, { base, path, token, origin, cardName }) {
  const context = await createContext(browser, { token, origin, enabled: false });
  const page = await context.newPage();
  const errors = watchPage(page);
  const consoleLines = [];
  page.on("console", (message) => {
    const text = message.text();
    if (/\bperf\b|__dashhaus/i.test(text)) consoleLines.push({ type: message.type(), text });
  });
  try {
    await page.goto(`${base}/${path.replace(/^\/+/, "")}`, { waitUntil: "domcontentloaded" });
    assertAuthenticated(page);
    await waitForCards(page);
    await page.getByRole("article", { name: cardName, exact: true }).first().waitFor({ state: "visible", timeout: 60_000 });
    await page.waitForTimeout(300);
    const dom = await readDom(page);
    const result = await page.evaluate(() => ({
      global: "__dashhausPerf" in window,
      marks: performance.getEntriesByType("mark").filter((mark) => mark.name.startsWith("dashhaus:")).length,
      measures: performance.getEntriesByType("measure").filter((measure) => measure.name.startsWith("dashhaus:")).length,
      probe: window.__perfProbe ?? { pointerdown: [], fetches: [] },
    }));
    const pointerdownListeners = result.probe.pointerdown
      .filter((entry) => entry.target === "window" && entry.capture && entry.passive).length;
    const fetches = result.probe.fetches.length;
    if (result.global || result.marks > 0 || result.measures > 0) {
      throw new Error("Instrumentation ran without the opt-in; the off check found a buffer, mark or measure.");
    }
    if (pointerdownListeners > 0) {
      throw new Error(`Instrumentation ran without the opt-in; the off check found ${pointerdownListeners} pointerdown listener(s).`);
    }
    if (fetches > 0) {
      throw new Error(`Instrumentation ran without the opt-in; the off check found a fetch from the bundle.`);
    }
    if (consoleLines.length > 0) {
      throw new Error(`Instrumentation ran without the opt-in; the off check found a console line: ${consoleLines[0].text}`);
    }
    if (errors.console > 0 || errors.page > 0) {
      throw new Error(`The dashboard logged ${errors.console} console error(s) and ${errors.page} page error(s) without the opt-in.`);
    }
    return {
      path,
      global: result.global,
      marks: result.marks,
      measures: result.measures,
      pointerdownListeners,
      fetches,
      console: consoleLines,
      cards: dom.cards,
      hosts: dom.hosts,
      errors,
    };
  } finally {
    await context.close();
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage());
    return;
  }
  if (existsSync(ENV)) process.loadEnvFile(ENV);
  const base = process.env.HA_URL?.trim().replace(/\/+$/, "");
  const token = process.env.HA_TOKEN?.trim();
  if (!base || !token) throw new Error("HA_URL and HA_TOKEN must be set in .env or the environment.");
  const origin = new URL(base).origin;
  const entity = options.entity ?? DEFAULT_ENTITY;
  if (!safeDomain(entity)) {
    throw new Error(`${entity} is not an input_boolean or switch; the collector only changes and restores those.`);
  }

  const { dashboards } = await loadDashboards({ file: CONFIG, env: process.env });
  const orbPath = options.orb ?? dashboards[0]?.path;
  const fieldPath = options.field ?? dashboards[1]?.path;
  if (!orbPath || !fieldPath) throw new Error("dashboard.config.mjs must declare the Orb and Field dashboards.");

  const ha = await connectHomeAssistant(base, token);
  const browser = await chromium.launch(chromiumLaunchOptions({ headless: !options.headed }));
  const startedAt = new Date().toISOString();
  try {
    for (const path of [orbPath, fieldPath]) {
      try {
        await ha.send("lovelace/config", { url_path: path });
      } catch {
        throw new Error(`Home Assistant has no dashboard at /${path}. Run npm run deploy first, or pass --orb/--field.`);
      }
    }
    const states = await ha.send("get_states");
    const entityState = states.find((state) => state.entity_id === entity);
    if (!entityState) throw new Error(`Home Assistant has no entity ${entity}.`);
    const cardName = options.card ?? entityState.attributes.friendly_name;
    if (!cardName) throw new Error(`Home Assistant has no friendly name for ${entity}; pass --card.`);

    const off = {
      orb: await offCheck(browser, { base, path: orbPath, token, origin, cardName }),
      field: await offCheck(browser, { base, path: fieldPath, token, origin, cardName }),
    };
    const skins = {};
    for (const [skin, path] of [["orb", orbPath], ["field", fieldPath]]) {
      skins[skin] = await runSkin(browser, skin, {
        path,
        base,
        token,
        origin,
        entity,
        cardName,
        ha,
      });
    }

    for (const skin of ["orb", "field"]) {
      if (off[skin].cards !== skins[skin].coldLoad.cards || off[skin].hosts !== skins[skin].coldLoad.hosts) {
        throw new Error(
          `The opt-in changed ${skin}: ${off[skin].cards} cards/${off[skin].hosts} hosts off, ` +
          `${skins[skin].coldLoad.cards} cards/${skins[skin].coldLoad.hosts} hosts on.`,
        );
      }
    }

    const report = {
      schema: 1,
      generatedAt: startedAt,
      commit: git("rev-parse", "HEAD"),
      branch: git("rev-parse", "--abbrev-ref", "HEAD"),
      dirty: git("status", "--porcelain", "--untracked-files=no").length > 0,
      ha: {
        url: base,
        version: ha.version,
        dashboards: { orb: orbPath, field: fieldPath },
      },
      browser: { name: "Chromium", version: browser.version(), headless: !options.headed },
      viewport: { ...VIEWPORT, deviceScaleFactor: 1, colorScheme: "dark" },
      instrumentation: {
        optIn: "?dashhaus_perf=1 or localStorage['dashhaus:perf']='1'",
        offCheck: off,
      },
      interaction: { entity, card: cardName, control: { orb: "toggle pill", field: "key" } },
      skins,
    };

    const stamp = startedAt.replace(/[:.]/g, "-");
    const out = options.out ? resolve(process.cwd(), options.out) : join(root, "perf", "reports", `run-${stamp}.json`);
    await mkdir(dirname(out), { recursive: true });
    await writeFile(out, `${JSON.stringify(report, null, 2)}\n`);
    console.log(`wrote ${relative(root, out)}`);
    for (const [skin, result] of Object.entries(skins)) {
      console.log(
        `${skin.padEnd(5)} ready ${result.coldLoad.timings.navigationToReadyMs ?? "?"}ms, ` +
        `details ${result.details.requestToVisibleMs}ms, ` +
        `toggle ${result.interaction.action.inputToSettledMs ?? "?"}ms (${result.interaction.before}→${result.interaction.after}, restored ${result.interaction.restored})`,
      );
    }
  } finally {
    await browser.close();
    ha.close();
  }
}

main().catch((error) => {
  console.error(`\n✗ ${error?.message ?? String(error)}`);
  process.exitCode = 1;
});
