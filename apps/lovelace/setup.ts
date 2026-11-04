/**
 * `custom:dashhaus-setup`: the one step a Marketplace (HACS) install leaves undone. The Marketplace copies the bundle
 * into `www/community/dashhaus/` and registers it; it creates no dashboard. This card does, from the frontend's own
 * authenticated connection, with the same websocket commands `dashhaus-deploy` sends: no Node, no token, no SSH.
 *
 * It is admin-only, create-only and idempotent. A press creates each checked dashboard that does not exist yet, saves
 * one panel view holding its skin's card, and leaves every existing dashboard exactly as it is. A save that fails after
 * this press created the dashboard deletes it again, so a retry never finds an empty one in the way.
 *
 * A plain custom element with no React, store or skin: it ships in the bundle beside the skins' Lovelace cards and is
 * not part of any package's contract. Each dashboard holds its skin's card with nothing but its type and title, the
 * automatic layout, as the deploy config the bundle's README prints does: a person who installs from the Marketplace
 * and one who deploys from the command line end with the same dashboards, which keep up as devices are added.
 */
import { registerCard } from "@dashhaus/dashboard/skin";

/** One dashboard the card can create: its sidebar entry and the custom card its single panel view holds. */
export interface SetupDashboard {
  /** The dashboard's URL path; Home Assistant requires a hyphen. */
  path: string;
  /** The sidebar title. */
  title: string;
  /** An `mdi:` icon for the sidebar. */
  icon: string;
  /** The card's type, `custom:<tag>`. */
  type: string;
}

/** The part of the frontend's connection the card uses. */
export interface SetupConnection {
  sendMessagePromise<T = unknown>(message: { type: string } & Record<string, unknown>): Promise<T>;
}

/** The part of the frontend's `hass` the card reads. */
export interface SetupHass {
  connection: SetupConnection;
  user?: { is_admin?: boolean; name?: string } | null;
}

export type SetupStatus = "created" | "existing" | "skipped" | "failed";

export interface SetupResult {
  path: string;
  title: string;
  status: SetupStatus;
  /** Why a dashboard was not created, in words for the person pressing the button. */
  error?: string;
}

interface DashboardItem {
  id?: string;
  url_path?: string;
}

/** Words for a refusal, before any command is sent. */
export const NOT_ADMIN = "Only an administrator can create dashboards. Ask one to open this page and press Create.";
export const YAML_MODE =
  "This Home Assistant manages its dashboards in YAML, so they can't be created from here. Create the dashboard in your configuration and add the Dashhaus card to it.";

/** The Lovelace config a dashboard is saved with: one panel view, so the card gets the full width. */
export function panelView(card: Record<string, unknown>, title = "Home") {
  return { views: [{ title, path: "home", type: "panel", cards: [card] }] };
}

/** A dashboard's one card: its skin's automatic layout, titled. */
export function setupCard(dashboard: SetupDashboard, title = "Home"): Record<string, unknown> {
  return { type: dashboard.type, title };
}

/** A Home Assistant websocket error (`{ code, message }`) or a thrown Error, in the card's words. */
export function describeError(error: unknown): string {
  const { code, message } = (error ?? {}) as { code?: unknown; message?: unknown };
  if (code === "unauthorized") return NOT_ADMIN;
  if (code === "unknown_command") return YAML_MODE;
  if (typeof message === "string" && message) return message;
  return String(error);
}

/** The URL paths of the dashboards that exist now. */
export async function existingPaths(connection: SetupConnection): Promise<Set<string>> {
  const items = await connection.sendMessagePromise<DashboardItem[]>({ type: "lovelace/dashboards/list" });
  return new Set((items ?? []).map((item) => item.url_path).filter((path): path is string => Boolean(path)));
}

/**
 * Create every selected dashboard that does not exist yet and save its panel view. Never renames, saves over or
 * deletes a dashboard it did not just create; a non-admin sends nothing. One dashboard's failure is reported on it
 * and the others carry on.
 */
export async function provision(
  hass: SetupHass,
  dashboards: readonly SetupDashboard[],
  selected: ReadonlySet<string>,
  pageTitle = "Home",
): Promise<SetupResult[]> {
  const result = (dashboard: SetupDashboard, status: SetupStatus, error?: string): SetupResult =>
    ({ path: dashboard.path, title: dashboard.title, status, ...(error ? { error } : {}) });
  if (!hass.user?.is_admin) return dashboards.map((dashboard) => result(dashboard, selected.has(dashboard.path) ? "failed" : "skipped", selected.has(dashboard.path) ? NOT_ADMIN : undefined));

  const { connection } = hass;
  let existing: Set<string>;
  try {
    existing = await existingPaths(connection);
  } catch (error) {
    const words = describeError(error);
    return dashboards.map((dashboard) => result(dashboard, selected.has(dashboard.path) ? "failed" : "skipped", selected.has(dashboard.path) ? words : undefined));
  }

  const results: SetupResult[] = [];
  for (const dashboard of dashboards) {
    if (!selected.has(dashboard.path)) {
      results.push(result(dashboard, "skipped"));
      continue;
    }
    if (existing.has(dashboard.path)) {
      results.push(result(dashboard, "existing"));
      continue;
    }
    let created: DashboardItem | null | undefined;
    try {
      created = await connection.sendMessagePromise<DashboardItem | null>({
        type: "lovelace/dashboards/create",
        url_path: dashboard.path,
        title: dashboard.title,
        icon: dashboard.icon,
        mode: "storage",
        show_in_sidebar: true,
        require_admin: false,
      });
    } catch (error) {
      results.push(result(dashboard, "failed", describeError(error)));
      continue;
    }
    try {
      await connection.sendMessagePromise({ type: "lovelace/config/save", url_path: dashboard.path, config: panelView(setupCard(dashboard, pageTitle), pageTitle) });
      results.push(result(dashboard, "created"));
    } catch (error) {
      await rollBack(connection, dashboard.path, created?.id);
      results.push(result(dashboard, "failed", describeError(error)));
    }
  }
  return results;
}

/** Delete a dashboard this press created and could not save, so the next press creates it again. */
async function rollBack(connection: SetupConnection, path: string, id: string | undefined) {
  try {
    const dashboardId = id ?? (await connection.sendMessagePromise<DashboardItem[]>({ type: "lovelace/dashboards/list" })).find((item) => item.url_path === path)?.id;
    if (dashboardId) await connection.sendMessagePromise({ type: "lovelace/dashboards/delete", dashboard_id: dashboardId });
  } catch {
    // The save's error is the one worth reporting; an empty dashboard left behind is listed as existing next time.
  }
}

const STYLES = `
:host { display: block; }
ha-card, .card { display: block; padding: 16px; color: var(--primary-text-color); background: var(--ha-card-background, var(--card-background-color)); border-radius: var(--ha-card-border-radius, 12px); }
h2 { margin: 0 0 4px; font-size: 1.25rem; font-weight: 500; }
p { margin: 0 0 12px; color: var(--secondary-text-color); line-height: 1.45; }
fieldset { margin: 0 0 16px; padding: 0; border: 0; }
legend { padding: 0; margin-bottom: 8px; font-weight: 500; }
label { display: flex; gap: 12px; align-items: center; min-height: 44px; }
label code { color: var(--secondary-text-color); font-size: 0.875em; }
.note { margin-left: auto; color: var(--secondary-text-color); font-size: 0.875em; }
button { min-height: 40px; padding: 0 20px; border: 0; border-radius: 20px; font: inherit; font-weight: 500; color: var(--text-primary-color); background: var(--primary-color); cursor: pointer; touch-action: manipulation; }
button:disabled { opacity: 0.5; cursor: default; }
button:focus-visible, input:focus-visible, a:focus-visible { outline: 2px solid var(--primary-color); outline-offset: 2px; }
ul { margin: 12px 0 0; padding: 0; list-style: none; }
li { padding: 4px 0; }
a { color: var(--primary-color); }
.failed { color: var(--error-color); }
[hidden] { display: none; }
`;

const STATUS_WORDS: Record<SetupStatus, string> = {
  created: "Created",
  existing: "Already there, left as it is",
  skipped: "Not chosen",
  failed: "Not created",
};

/**
 * Define `custom:dashhaus-setup` for these dashboards and list it in the card picker as "Dashhaus setup". Safe to
 * call twice, like every card the bundle registers.
 */
export function defineSetupCard(dashboards: readonly SetupDashboard[], pageTitle = "Home") {
  class DashhausSetupCard extends HTMLElement {
    #hass?: SetupHass;
    #existing?: Set<string>;
    #busy = false;
    #results?: SetupResult[];
    #message = "";
    #listed = false;
    /** The boxes a person unchecked; every dashboard not yet there starts checked. */
    readonly #unchecked = new Set<string>();
    readonly #root = this.attachShadow({ mode: "open" });

    static getStubConfig() {
      return { type: "custom:dashhaus-setup" };
    }

    setConfig(_config: unknown) {
      // Nothing to configure: the dashboards it offers are the bundle's.
    }

    getCardSize() {
      return 4;
    }

    set hass(hass: SetupHass) {
      const first = !this.#hass;
      this.#hass = hass;
      if (first) this.#render();
      if (!this.#listed && hass.user?.is_admin) {
        this.#listed = true;
        void this.#list();
      }
    }

    connectedCallback() {
      this.#render();
    }

    async #list() {
      if (!this.#hass) return;
      try {
        this.#existing = await existingPaths(this.#hass.connection);
      } catch (error) {
        this.#message = describeError(error);
      }
      this.#render();
    }

    async #create() {
      if (!this.#hass || this.#busy) return;
      const selected = new Set(
        dashboards.map((dashboard) => dashboard.path).filter((path) => !this.#unchecked.has(path) && !this.#existing?.has(path)),
      );
      if (!selected.size) {
        this.#message = "Choose at least one dashboard to create.";
        this.#render();
        return;
      }
      this.#busy = true;
      this.#message = "Creating…";
      this.#render();
      const results = await provision(this.#hass, dashboards, selected, pageTitle);
      this.#busy = false;
      this.#results = results;
      const created = results.filter((entry) => entry.status === "created").length;
      const failed = results.filter((entry) => entry.status === "failed").length;
      this.#message = failed
        ? `${failed === 1 ? "One dashboard was" : `${failed} dashboards were`} not created; see below.`
        : created
          ? "Done. Open a dashboard below. If the sidebar doesn't show it yet, reload the page. You can remove this card now."
          : "Nothing to create: every chosen dashboard is already there.";
      try {
        this.#existing = await existingPaths(this.#hass.connection);
      } catch {
        // The results already say what happened; the boxes keep their last known state.
      }
      this.#render();
    }

    #render() {
      const admin = Boolean(this.#hass?.user?.is_admin);
      const card = document.createElement("ha-card");
      card.className = "card";
      const heading = document.createElement("h2");
      heading.textContent = "Dashhaus setup";
      const intro = document.createElement("p");
      intro.textContent = "Create a dashboard for each Dashhaus look you want. A dashboard that already exists is never changed.";
      card.append(heading, intro);

      if (this.#hass && !admin) {
        const refusal = document.createElement("p");
        refusal.setAttribute("role", "alert");
        refusal.textContent = NOT_ADMIN;
        card.append(refusal);
        this.#root.replaceChildren(style(), card);
        return;
      }

      const fieldset = document.createElement("fieldset");
      const legend = document.createElement("legend");
      legend.textContent = "Dashboards";
      fieldset.append(legend);
      for (const dashboard of dashboards) {
        const exists = this.#existing?.has(dashboard.path) ?? false;
        const label = document.createElement("label");
        const box = document.createElement("input");
        box.type = "checkbox";
        box.value = dashboard.path;
        box.checked = !exists && !this.#unchecked.has(dashboard.path);
        box.disabled = exists || this.#busy;
        box.addEventListener("change", () => {
          if (box.checked) this.#unchecked.delete(dashboard.path);
          else this.#unchecked.add(dashboard.path);
        });
        const name = document.createElement("span");
        name.textContent = dashboard.title;
        const path = document.createElement("code");
        path.textContent = `/${dashboard.path}`;
        label.append(box, name, path);
        if (exists) {
          const note = document.createElement("span");
          note.className = "note";
          note.textContent = "Already there";
          label.append(note);
        }
        fieldset.append(label);
      }

      const button = document.createElement("button");
      button.type = "button";
      button.textContent = "Create dashboards";
      button.disabled = this.#busy || !this.#hass || dashboards.every((dashboard) => this.#existing?.has(dashboard.path));
      if (this.#busy) button.setAttribute("aria-busy", "true");
      button.addEventListener("click", () => void this.#create());

      const status = document.createElement("p");
      status.setAttribute("role", "status");
      status.textContent = this.#message;

      card.append(fieldset, button, status);

      if (this.#results) {
        const list = document.createElement("ul");
        for (const entry of this.#results.filter((item) => item.status !== "skipped")) {
          const item = document.createElement("li");
          if (entry.status === "failed") {
            item.className = "failed";
            item.setAttribute("role", "alert");
            item.textContent = `${entry.title}: ${STATUS_WORDS.failed}. ${entry.error ?? ""}`.trim();
          } else {
            const link = document.createElement("a");
            link.href = `/${entry.path}`;
            link.textContent = `Open ${entry.title}`;
            item.append(link, ` — ${STATUS_WORDS[entry.status]}`);
          }
          list.append(item);
        }
        card.append(list);
      }
      this.#root.replaceChildren(style(), card);
    }
  }

  registerCard("dashhaus-setup", DashhausSetupCard, "Dashhaus setup", "Creates the Dashhaus dashboards once, then can be removed.");
}

function style() {
  const element = document.createElement("style");
  element.textContent = STYLES;
  return element;
}
