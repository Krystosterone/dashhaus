/**
 * The in-memory Home Assistant the DX drivers deploy into: the same shape as the fake in
 * `packages/deploy/src/deploy.test.ts`, kept here so both clean-room apps use one fake and no network.
 *
 * It records every websocket command, the resource it registered, the dashboards it created and each saved layout.
 */
export class FakeHomeAssistant {
  version = "2026.10.0";
  resources = [];
  dashboards = [];
  saved = [];
  calls = [];
  closed = false;
  failResources = false;

  async send(type, payload = {}) {
    this.calls.push({ type, payload });
    if (type === "lovelace/resources") {
      if (this.failResources) throw new Error("resources are YAML");
      return this.resources;
    }
    if (type === "lovelace/resources/create") {
      this.resources.push({ id: `resource-${this.resources.length + 1}`, url: payload.url });
      return null;
    }
    if (type === "lovelace/resources/update") {
      const resource = this.resources.find((candidate) => candidate.id === payload.resource_id);
      if (resource) resource.url = payload.url;
      return null;
    }
    if (type === "lovelace/dashboards/list") return this.dashboards;
    if (type === "lovelace/dashboards/create") {
      this.dashboards.push({
        id: `dashboard-${this.dashboards.length + 1}`,
        url_path: payload.url_path,
        title: payload.title,
      });
      return null;
    }
    if (type === "lovelace/dashboards/update") {
      const dashboard = this.dashboards.find((candidate) => candidate.id === payload.dashboard_id);
      if (dashboard) dashboard.title = payload.title;
      return null;
    }
    if (type === "lovelace/config/save") {
      this.saved.push({ url_path: payload.url_path, config: payload.config });
      return null;
    }
    if (type === "get_states") {
      return [{ entity_id: "light.bed", state: "on", attributes: { friendly_name: "Bed" } }];
    }
    throw new Error(`unexpected Home Assistant command ${type}`);
  }

  close() {
    this.closed = true;
  }
}

/** The `connect` callback a driver injects; it records the URL and token and returns the fake. */
export function connectTo(ha, seen = {}) {
  return async (url, token) => {
    seen.url = url;
    seen.token = token;
    return ha;
  };
}
