import { StrictMode } from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { HaWeatherTile } from "./HaWeatherTile";
import { HaProvider } from "./provider";
import { createHaStore } from "./store";
import type { HaTransport, HassEntities } from "./types";

const entities: HassEntities = {
  "weather.home": {
    entity_id: "weather.home",
    state: "partlycloudy",
    attributes: {
      friendly_name: "Home",
      temperature: 21.5,
      temperature_unit: "°C",
      wind_speed_unit: "km/h",
      pressure_unit: "hPa",
    },
    last_updated: "2026-10-20T10:00:00Z",
  },
  "sensor.home_aqi": {
    entity_id: "sensor.home_aqi",
    state: "42",
    attributes: { device_class: "aqi" },
  },
  "sun.sun": {
    entity_id: "sun.sun",
    state: "above_horizon",
    attributes: {},
  },
};

const forecastResponse = {
  response: {
    "weather.home": {
      forecast: [{ datetime: "2026-10-20T12:00:00Z", condition: "sunny", temperature: 23, templow: 12 }],
    },
  },
};

function transport() {
  const callService = vi.fn(async () => forecastResponse);
  const value: HaTransport = {
    subscribeEntities(listener) {
      queueMicrotask(() => listener(entities));
      return () => undefined;
    },
    callService,
  };
  return { value, callService };
}

describe("HaWeatherTile", () => {
  it("maps weather companions and loads daily and hourly forecasts through the shared store", async () => {
    vi.stubGlobal("ResizeObserver", class {
      observe() {}
      disconnect() {}
    });
    const fake = transport();
    const store = createHaStore(fake.value);

    render(
      <HaProvider store={store}>
        <HaWeatherTile
          entityId="weather.home"
          aqiEntityId="sensor.home_aqi"
          aqiScale="US"
          sunEntityId="sun.sun"
          footprint="compact"
          showControl={false}
        />
      </HaProvider>,
    );

    await waitFor(() => expect(screen.getByRole("heading", { name: "Home" })).toBeTruthy());
    expect(document.querySelector(".hd-area")?.textContent).toMatch(/^Partly cloudy/);
    expect(document.querySelector("article[data-control='off']")).toBeTruthy();
    await waitFor(() => expect(fake.callService).toHaveBeenCalledTimes(2));
    expect(document.querySelector(".hd-c > article")).toBeTruthy();
    expect(document.querySelector(".hd-slot .hd-val")).toBeTruthy();
    // A bare compact row opens details through the details button's full-row overlay (CSS), which jsdom
    // doesn't lay out: click the button the row tap lands on.
    fireEvent.click(screen.getByRole("button", { name: "Home weather details" }));
    await waitFor(() => expect(document.querySelector("dialog[open]")).toBeTruthy());
    expect(screen.getByText("Next days")).toBeTruthy();
    expect(fake.callService).toHaveBeenCalledWith(
      "weather",
      "get_forecasts",
      { type: expect.stringMatching(/^(hourly|daily)$/) },
      { target: { entity_id: "weather.home" }, returnResponse: true },
    );
    vi.unstubAllGlobals();
  });

  it("deduplicates forecast requests across StrictMode effect replay", async () => {
    vi.stubGlobal("ResizeObserver", class {
      observe() {}
      disconnect() {}
    });
    const fake = transport();
    const store = createHaStore(fake.value);
    await store.connect();

    render(
      <StrictMode>
        <HaProvider store={store}>
          <HaWeatherTile entityId="weather.home" />
        </HaProvider>
      </StrictMode>,
    );

    await waitFor(() => expect(fake.callService).toHaveBeenCalledTimes(2));
    vi.unstubAllGlobals();
  });

  it("does not refetch forecasts when only the error callback identity changes", async () => {
    vi.stubGlobal("ResizeObserver", class {
      observe() {}
      disconnect() {}
    });
    const fake = transport();
    const store = createHaStore(fake.value);
    const view = render(
      <HaProvider store={store}>
        <HaWeatherTile entityId="weather.home" onForecastError={() => undefined} />
      </HaProvider>,
    );

    await waitFor(() => expect(fake.callService).toHaveBeenCalledTimes(2));
    view.rerender(
      <HaProvider store={store}>
        <HaWeatherTile entityId="weather.home" onForecastError={() => undefined} />
      </HaProvider>,
    );
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(fake.callService).toHaveBeenCalledTimes(2);
    view.unmount();
    vi.unstubAllGlobals();
  });

  it("restarts forecast requests when a connected generation changes", async () => {
    vi.stubGlobal("ResizeObserver", class {
      observe() {}
      disconnect() {}
    });
    const pending: ((value: typeof forecastResponse) => void)[] = [];
    let emitConnection: ((status: "connected" | "disconnected" | "error") => void) | undefined;
    const listeners: ((entities: HassEntities) => void)[] = [];
    const value: HaTransport = {
      subscribeConnection(listener) {
        emitConnection = listener;
        return () => undefined;
      },
      subscribeEntities(listener) {
        listeners.push(listener);
        return () => undefined;
      },
      callService: vi.fn(() => new Promise<typeof forecastResponse>((resolve) => pending.push(resolve))),
    };
    const store = createHaStore(value);
    render(
      <HaProvider store={store}>
        <HaWeatherTile entityId="weather.home" />
      </HaProvider>,
    );

    await waitFor(() => expect(listeners).toHaveLength(1));
    await act(async () => { listeners[0](entities); });
    await waitFor(() => expect(value.callService).toHaveBeenCalledTimes(2));
    await act(async () => {
      emitConnection?.("disconnected");
      emitConnection?.("connected");
      listeners[0](entities);
    });
    await waitFor(() => expect(value.callService).toHaveBeenCalledTimes(4));

    await act(async () => {
      pending[0](forecastResponse);
      pending[1](forecastResponse);
      pending[2](forecastResponse);
      pending[3](forecastResponse);
    });
    fireEvent.click(screen.getByRole("button", { name: "Home weather details" }));
    await waitFor(() => expect(screen.getByText("Next days")).toBeTruthy());
    vi.unstubAllGlobals();
  });

  it("reports forecast query failures without replacing the current weather state", async () => {
    vi.stubGlobal("ResizeObserver", class {
      observe() {}
      disconnect() {}
    });
    const fake = transport();
    vi.mocked(fake.callService).mockRejectedValue(new Error("forecast permission denied"));
    const onForecastError = vi.fn();
    const store = createHaStore(fake.value);

    render(
      <HaProvider store={store}>
        <HaWeatherTile entityId="weather.home" onForecastError={onForecastError} />
      </HaProvider>,
    );

    await waitFor(() => expect(screen.getByText("Partly cloudy")).toBeTruthy());
    await waitFor(() => expect(onForecastError).toHaveBeenCalledWith(expect.objectContaining({ code: "service_failed" })));
    vi.unstubAllGlobals();
  });

  it("keeps a successful hourly forecast when the daily query fails", async () => {
    vi.stubGlobal("ResizeObserver", class {
      observe() {}
      disconnect() {}
    });
    const hourly = {
      response: { "weather.home": { forecast: [{ datetime: "2026-10-20T01:00:00Z", condition: "rainy", temperature: 18 }] } },
    };
    const onForecastError = vi.fn();
    const transport: HaTransport = {
      subscribeEntities: vi.fn((listener) => { queueMicrotask(() => listener(entities)); return () => undefined; }),
      callService: vi.fn((_domain, _service, data) => data?.type === "hourly"
        ? Promise.resolve(hourly)
        : Promise.reject(new Error("daily denied"))),
    };
    const store = createHaStore(transport);

    render(
      <HaProvider store={store}>
        <HaWeatherTile
          entityId="weather.home"
          footprint="featured"
          // The forecast hour is local time: start the day one hour before it, whatever the timezone.
          history={{ temperature: [], currentHour: new Date("2026-10-20T01:00:00Z").getHours() - 1 }}
          onForecastError={onForecastError}
        />
      </HaProvider>,
    );

    await waitFor(() => expect(onForecastError).toHaveBeenCalledOnce());
    await waitFor(() => expect(document.querySelector(".wx-hr")).toBeTruthy());
    vi.unstubAllGlobals();
  });

  it("keeps a successful daily forecast when the hourly query fails", async () => {
    vi.stubGlobal("ResizeObserver", class {
      observe() {}
      disconnect() {}
    });
    const daily = {
      response: { "weather.home": { forecast: [
        { datetime: "2026-10-20T00:00:00Z", condition: "cloudy", temperature: 20, templow: 10, day: "Tue" },
        { datetime: "2026-10-21T00:00:00Z", condition: "sunny", temperature: 22, templow: 11, day: "Wed" },
      ] } },
    };
    const onForecastError = vi.fn();
    const transport: HaTransport = {
      subscribeEntities: vi.fn((listener) => { queueMicrotask(() => listener(entities)); return () => undefined; }),
      callService: vi.fn((_domain, _service, data) => data?.type === "daily"
        ? Promise.resolve(daily)
        : Promise.reject(new Error("hourly denied"))),
    };
    const store = createHaStore(transport);

    render(
      <HaProvider store={store}>
        <HaWeatherTile entityId="weather.home" defaultOpen onForecastError={onForecastError} />
      </HaProvider>,
    );

    await waitFor(() => expect(onForecastError).toHaveBeenCalledOnce());
    await waitFor(() => expect(screen.getByText("Wed")).toBeTruthy());
    vi.unstubAllGlobals();
  });
});
