import type { SensorEntity, SensorHistory, Reading } from "@scope/core/entities/sensor/types";

/** Example data for stories. Times are fixed so screenshots stay stable. */
const HOUR = 11;
const ahead = (n: number): Reading[] => Array(n).fill(null);
const day = (past: Reading[], now: Reading): Reading[] => [...past, now, ...ahead(24 - past.length - 1)];

export interface SensorSeed { entity: SensorEntity; history: SensorHistory }

const seed = (entity: SensorEntity, temps: Reading[], hums?: Reading[]): SensorSeed => ({
  entity,
  history: {
    temperature: day(temps, entity.state === "unavailable" ? "unavailable" : entity.temperature ?? null),
    humidity: hums ? day(hums, entity.state === "unavailable" ? "unavailable" : entity.humidity ?? null) : undefined,
    currentHour: HOUR,
  },
});

export const SENSOR_SEEDS = {
  living: seed(
    { entityId: "sensor.living_room", name: "Living room", area: "Living room", state: "ok", temperature: 21.4, humidity: 44, unit: "°C", battery: 82, lastUpdated: "11:52" },
    [20.1, 19.9, 19.7, 19.6, 19.5, 19.6, 20.2, 20.9, 21.3, 21.0, 21.0],
    [46, 46, 47, 47, 47, 46, 45, 44, 44, 44, 44],
  ),
  bedroom: seed(
    { entityId: "sensor.bedroom", name: "Bedroom", area: "Bedroom", state: "ok", temperature: 20.1, humidity: 52, unit: "°C", battery: 64, lastUpdated: "11:50" },
    [19.2, 19.0, 18.9, 18.8, 18.8, 18.9, 19.4, 19.9, 20.0, 20.1, 20.2],
    [55, 56, 56, 56, 57, 56, 54, 53, 52, 52, 52],
  ),
  bathroom: seed(
    { entityId: "sensor.bathroom", name: "Bathroom", area: "Bathroom", state: "ok", temperature: 23.6, humidity: 71, unit: "°C", battery: 91, lastUpdated: "11:53" },
    [21.0, 20.8, 20.7, 20.6, 20.6, 20.7, 22.9, 24.1, 23.0, 22.4, 22.0],
    [55, 54, 54, 54, 54, 55, 82, 88, 74, 66, 63],
  ),
  outdoor: seed(
    { entityId: "sensor.outside", name: "Outside", area: "Backyard", state: "ok", temperature: 6.2, humidity: 78, unit: "°C", outdoor: true, battery: 70, lastUpdated: "11:48" },
    [4.1, 3.8, 3.5, 3.3, 3.1, 3.0, 3.4, 4.2, 5.0, 5.6, 6.0],
    [88, 89, 90, 90, 91, 91, 89, 85, 82, 80, 79],
  ),
  basement: seed(
    { entityId: "sensor.basement", name: "Basement", area: "Basement", state: "ok", temperature: 17.2, humidity: 28, unit: "°C", battery: 8, lastUpdated: "11:40" },
    [17.6, 17.5, 17.5, 17.4, 17.4, 17.3, 17.3, 17.2, 17.2, 17.2, 17.2],
    [29, 29, 29, 28, 28, 28, 28, 28, 28, 28, 28],
  ),
  office: seed(
    { entityId: "sensor.office", name: "Office", area: "Office", state: "ok", temperature: 21.2, unit: "°C", lastUpdated: "11:51" },
    [19.0, 18.9, 18.8, 18.8, 18.7, 18.7, 19.8, 20.6, 20.9, 21.0, 21.1],
  ),
  garage: seed(
    { entityId: "sensor.garage", name: "Garage", area: "Garage", state: "unavailable", unit: "°C", battery: 3, lastSeen: "08:20" },
    [9.1, 8.8, 8.6, 8.4, 8.3, 8.2, 8.3, 8.6, "unavailable", "unavailable", "unavailable"],
    [70, 71, 71, 72, 72, 72, 71, 70, "unavailable", "unavailable", "unavailable"],
  ),
} satisfies Record<string, SensorSeed>;

export type SensorSeedName = keyof typeof SENSOR_SEEDS;

/*
 * Worst-case data: values real Home Assistant installs produce, not random strings. Long and compound names,
 * missing areas, readings at and past their limits, raw floats from integrations, no readings yet. The card's
 * Worst case story and Orb → Foundations → Worst case both draw these.
 */
const H = HOUR;
const zeros = (n: number) => Array<number>(n).fill(0);
export const SENSOR_WORST_CASE: SensorSeed[] = [
  { // Hovering around zero outdoors, saturated humidity, a nearly flat battery
    entity: { entityId: "sensor.backyard", name: "Backyard weather station", area: "Garden, north side", state: "ok", temperature: -0.04, humidity: 100, unit: "°C", outdoor: true, battery: 1, lastUpdated: "11:53" },
    history: { temperature: day([1.2, 0.8, 0.3, -0.2, -0.6, -0.9, -0.7, -0.4, -0.1, 0.0, -0.02], -0.04), humidity: day([97, 98, 99, 100, 100, 100, 100, 100, 100, 100, 100], 100), currentHour: H },
  },
  { // Sauna: far past every comfort band, almost no humidity
    entity: { entityId: "sensor.sauna", name: "Sauna", area: "Spa", state: "ok", temperature: 92.4, humidity: 4, unit: "°C", lastUpdated: "11:54" },
    history: { temperature: day([21, 21, 21, 21, 21, 21, 21, 40, 75, 88, 91], 92.4), humidity: day([40, 40, 40, 40, 40, 40, 40, 20, 8, 5, 4], 4), currentHour: H },
  },
  { // Paired at midnight, no reading has arrived yet
    entity: { entityId: "sensor.crawlspace", name: "Crawlspace", area: "Basement", state: "ok", unit: "°C", battery: 100 },
    history: { temperature: day(Array<Reading>(H).fill("unavailable"), null), humidity: day(Array<Reading>(H).fill("unavailable"), null), currentHour: H },
  },
  { // A Fahrenheit winter night: the widest temperature beside the widest humidity
    entity: { entityId: "sensor.shed", name: "Shed", area: "Garden", state: "ok", temperature: -13.7, humidity: 100, unit: "°F", outdoor: true, battery: 40, lastUpdated: "11:50" },
    history: { temperature: day([-4, -6, -8, -10, -11, -12, -13, -13.5, -13.6, -13.7, -13.7], -13.7), humidity: day(Array<Reading>(H).fill(100), 100), currentHour: H },
  },
  { // Long compound name, bone dry
    entity: { entityId: "sensor.arbeitszimmer", name: "Arbeitszimmer-Fensterbank", area: "Arbeitszimmer", state: "ok", temperature: 12.25, humidity: 0, unit: "°C", battery: 15, lastUpdated: "11:41" },
    history: { temperature: day([13, 13, 12.9, 12.8, 12.6, 12.5, 12.4, 12.3, 12.3, 12.3, 12.3], 12.25), humidity: day(zeros(H), 0), currentHour: H },
  },
];
