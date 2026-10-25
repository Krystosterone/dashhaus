import { useState } from "react";
import type { ClimateEntity, HvacMode } from "../domains/climate/types";
import type { LightEntity } from "../domains/light/types";
import type { ToggleEntity } from "../domains/toggle/types";
import type { DailyForecast, WeatherEntity } from "../domains/weather/types";
import { GlassClimateCard } from "./ClimateCard";
import { GlassLightCard } from "./LightCard";
import { GlassToggleCard } from "./ToggleCard";

/* Story data for the glass cards: seeds, and local state that answers the cards' actions the way Home Assistant
   would. The live cards get the same props from the headless components in src/ha/headless.tsx. */

/** A morning, so the greeting and the weather's date don't change with the clock the stories are opened at. */
export const DEMO_NOW = new Date(2026, 9, 24, 9, 30);

export const CLIMATES = {
  cooling: {
    entityId: "climate.living_room", name: "Air conditioner", area: "Living room", state: "cool", hvacAction: "cooling",
    hvacModes: ["off", "heat", "cool", "heat_cool", "auto", "fan_only"], currentTemperature: 23.4, targetTemperature: 21,
    minTemp: 16, maxTemp: 30, step: 0.5, unit: "°C", fanModes: ["auto", "low", "medium", "high"], fanMode: "auto",
    presetModes: ["none", "eco", "sleep"], presetMode: "eco", lastChanged: "9:12",
  },
  range: {
    entityId: "climate.hallway", name: "Thermostat", area: "Hallway", state: "heat_cool", hvacAction: "idle",
    hvacModes: ["off", "heat", "cool", "heat_cool"], currentTemperature: 21.6, targetLow: 20, targetHigh: 24,
    minTemp: 7, maxTemp: 35, step: 0.5, unit: "°C",
  },
  off: {
    entityId: "climate.bedroom", name: "Heat pump", area: "Bedroom", state: "off", hvacAction: "off",
    hvacModes: ["off", "heat", "cool"], currentTemperature: 18.2, targetTemperature: 19, minTemp: 16, maxTemp: 30, step: 1, unit: "°C",
  },
  unavailable: {
    entityId: "climate.nursery", name: "Radiator", area: "Nursery", state: "unavailable", hvacModes: [],
    minTemp: 7, maxTemp: 35, step: 0.5, unit: "°C", lastSeen: "7:48",
  },
  worst: {
    entityId: "climate.primary", name: "Climatiseur de la chambre principale à l'étage", area: "Chambre principale et salle de bain attenante",
    state: "heat", hvacAction: "heating", hvacModes: ["off", "heat", "cool", "heat_cool", "auto", "dry", "fan_only"],
    currentTemperature: -12.3, targetTemperature: 29.5, minTemp: 7, maxTemp: 30, step: 0.5, unit: "°C",
    fanModes: ["diffuse_quiet_night_mode", "turbo"], fanMode: "diffuse_quiet_night_mode", presetModes: ["comfort_plus_extended", "away"], presetMode: "comfort_plus_extended",
  },
} satisfies Record<string, ClimateEntity>;

export const LIGHTS = {
  colour: {
    entityId: "light.ambient_led", name: "Ambient LED", area: "Living room", state: "on", supportsBrightness: true, brightness: 62,
    supportsColor: true, hs: [282, 78], supportsColorTemp: true, minKelvin: 2700, maxKelvin: 6500, lastChanged: "8:40",
  },
  warm: {
    entityId: "light.reading_lamp", name: "Reading lamp", area: "Office", state: "on", supportsBrightness: true, brightness: 80,
    supportsColorTemp: true, kelvin: 2900, minKelvin: 2200, maxKelvin: 5000, lastChanged: "9:02",
  },
  dimmable: {
    entityId: "light.hallway", name: "Pendant", area: "Hallway", state: "off", supportsBrightness: true, brightness: 40, lastChanged: "7:15",
  },
  onOff: {
    entityId: "light.porch", name: "Porch light", area: "Front porch", state: "on", supportsBrightness: false, lastChanged: "6:02",
  },
  unavailable: {
    entityId: "light.night", name: "Night light", area: "Nursery", state: "unavailable", supportsBrightness: true, lastSeen: "7:48",
  },
  worst: {
    entityId: "light.basement", name: "superlongunbrokenlightnamewithoutanyspaces_led_strip", area: "Basement home theatre and games room",
    state: "on", supportsBrightness: true, brightness: 1, supportsColor: true, hs: [359.6, 100], supportsColorTemp: true, minKelvin: 2000, maxKelvin: 6535,
  },
} satisfies Record<string, LightEntity>;

export const TOGGLES = {
  wifi: { entityId: "switch.router", name: "WiFi", area: "Office", state: "on", icon: "waves", lastChanged: "6:00" },
  guest: { entityId: "input_boolean.guest", name: "Guest mode", area: "Home", state: "off", icon: "guest", lastChanged: "21:40" },
  quiet: { entityId: "input_boolean.quiet", name: "Do not disturb", area: "Home", state: "on", icon: "bell-off", until: "11:00" },
  unavailable: { entityId: "switch.away", name: "Holiday mode", area: "Home", state: "unavailable", icon: "away", lastSeen: "7:48" },
  worst: { entityId: "switch.long", name: "Kitchen speaker beside the coffee machine", area: "Kitchen", state: "off", icon: "volume-off" },
} satisfies Record<string, ToggleEntity>;

export const WEATHERS = {
  home: {
    entityId: "weather.home", name: "Home", state: "partlycloudy", temperature: 23, humidity: 56, windSpeed: 25, isDay: true,
    temperatureUnit: "°C", windSpeedUnit: "km/h", pressureUnit: "hPa",
  },
  unavailable: {
    entityId: "weather.home", name: "Home", state: "unavailable", temperatureUnit: "°C", windSpeedUnit: "km/h", pressureUnit: "hPa", lastSeen: "6:30",
  },
  worst: {
    entityId: "weather.balcony", name: "Weather station on the north-facing balcony railing", state: "lightning-rainy", temperature: -38.6, humidity: 100,
    windSpeed: 142.4, isDay: false, temperatureUnit: "°F", windSpeedUnit: "mph", pressureUnit: "inHg",
  },
} satisfies Record<string, WeatherEntity>;

export const DAILY: DailyForecast[] = [
  { day: "Sat", condition: "partlycloudy", high: 24, low: 15 },
  { day: "Sun", condition: "rainy", high: 21, low: 14 },
  { day: "Mon", condition: "sunny", high: 26, low: 16 },
  { day: "Tue", condition: "cloudy", high: 22, low: 15 },
  { day: "Wed", condition: "lightning-rainy", high: 19, low: 13 },
];

export function useDemoClimate(seed: ClimateEntity) {
  const [entity, set] = useState(seed);
  const on = (mode: HvacMode, x: ClimateEntity): ClimateEntity => ({ ...x, state: mode, hvacAction: mode === "off" ? "off" : mode === "cool" ? "cooling" : mode === "heat" ? "heating" : "idle" });
  return {
    entity,
    onToggle: () => set((x) => on(x.state === "off" ? x.hvacModes.find((m) => m !== "off") ?? "heat" : "off", x)),
    onTargetChange: (t: number) => set((x) => ({ ...x, targetTemperature: t })),
    onRangeChange: (lo: number, hi: number) => set((x) => ({ ...x, targetLow: lo, targetHigh: hi })),
    onModeChange: (m: HvacMode) => set((x) => on(m, x)),
    onPresetChange: (p: string) => set((x) => ({ ...x, presetMode: p })),
    onFanChange: (f: string) => set((x) => ({ ...x, fanMode: f })),
  };
}

export function useDemoLight(seed: LightEntity) {
  const [entity, set] = useState(seed);
  return {
    entity,
    onToggle: () => set((x) => ({ ...x, state: x.state === "on" ? "off" : "on" })),
    onBrightnessChange: (b: number) => set((x) => ({ ...x, state: "on", brightness: b })),
    onKelvinChange: (k: number) => set((x) => ({ ...x, state: "on", kelvin: k, hs: undefined })),
    onColorChange: (hs: [number, number]) => set((x) => ({ ...x, state: "on", hs, kelvin: undefined })),
  };
}

export function useDemoToggle(seed: ToggleEntity) {
  const [entity, set] = useState(seed);
  return {
    entity,
    onToggle: () => set((x) => ({ ...x, state: x.state === "on" ? "off" : "on", until: undefined, lastChanged: "9:30" })),
  };
}

export const DemoClimate = ({ seed }: { seed: ClimateEntity }) => <GlassClimateCard {...useDemoClimate(seed)} />;
export const DemoLight = ({ seed }: { seed: LightEntity }) => <GlassLightCard {...useDemoLight(seed)} />;
export const DemoToggle = ({ seed }: { seed: ToggleEntity }) => <GlassToggleCard {...useDemoToggle(seed)} />;
