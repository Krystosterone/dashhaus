import type { Reading } from "../entities/history";
import type { NumericEntity, NumericHistory } from "../entities/numeric/types";

/** Example data for stories. The clock is fixed at 11:54 so screenshots stay stable. */
const NOW = { hour: 11 };

/** Hours 0 to 10, then the current hour, then hours ahead. */
const day = (past: Reading[], now: Reading): NumericHistory => ({
  readings: [...past, now, ...Array<null>(24 - past.length - 1).fill(null)],
  currentHour: NOW.hour,
});

export interface NumericSeed { entity: NumericEntity; history: NumericHistory }

export const NUMERIC_SEEDS = {
  /**
   * A measurement: the living room's CO₂, climbing as the house wakes and easing off when a window opens. It warns
   * above 1200 ppm (`warn_above`), so its details say the limit, and it is under it.
   */
  co2: {
    entity: { entityId: "sensor.living_room_co2", name: "Living room CO₂", area: "Living room", state: "ok", value: 650, unit: "ppm", deviceClass: "carbon_dioxide", stateClass: "measurement", lastUpdated: "11:53", warnAbove: 1200 },
    history: day([520, 505, 490, 480, 470, 475, 540, 780, 940, 860, 720], 650),
  },
  /** Power now, a whole number of watts: the dishwasher heating its water. */
  power: {
    entity: { entityId: "sensor.dishwasher_power", name: "Dishwasher", area: "Kitchen", state: "ok", value: 1840, unit: "W", deviceClass: "power", stateClass: "measurement", lastUpdated: "11:54" },
    history: day([1, 1, 1, 1, 1, 1, 1, 1, 1, 12, 1460], 1840),
  },
  /** A meter that only climbs: today it says how far it rose, not a low and a high. */
  energy: {
    entity: { entityId: "sensor.house_energy", name: "House energy", area: "Utility room", state: "ok", value: 1523.3, unit: "kWh", deviceClass: "energy", stateClass: "total_increasing", lastUpdated: "11:50" },
    history: day([1514.7, 1515.0, 1515.3, 1515.6, 1515.9, 1516.2, 1516.8, 1518.1, 1519.4, 1520.6, 1521.9], 1523.3),
  },
  /** Negative: the grid's power while the solar panels export at midday. */
  export: {
    entity: { entityId: "sensor.grid_power", name: "Grid", area: "Utility room", state: "ok", value: -1240, unit: "W", deviceClass: "power", stateClass: "measurement", lastUpdated: "11:54" },
    history: day([310, 290, 280, 270, 280, 300, 420, 180, -260, -820, -1110], -1240),
  },
  /** Past the limit above: the bedroom's CO₂ over the 1200 ppm it warns above, a closed door overnight. */
  high: {
    entity: { entityId: "sensor.bedroom_co2", name: "Bedroom CO₂", area: "Bedroom", state: "ok", value: 1450, unit: "ppm", deviceClass: "carbon_dioxide", stateClass: "measurement", lastUpdated: "11:52", warnAbove: 1200 },
    history: day([880, 1010, 1130, 1240, 1330, 1390, 1460, 1520, 1480, 1440, 1460], 1450),
  },
  /** Past the limit below: a sump pump's backup battery under the 12 V it warns below. */
  low: {
    entity: { entityId: "sensor.sump_pump_battery_voltage", name: "Sump pump battery", area: "Basement", state: "ok", value: 11.6, unit: "V", deviceClass: "voltage", stateClass: "measurement", lastUpdated: "11:40", warnBelow: 12 },
    history: day([12.4, 12.4, 12.3, 12.3, 12.2, 12.1, 12.0, 11.9, 11.8, 11.7, 11.6], 11.6),
  },
  /** No unit and no device class: a count. */
  count: {
    entity: { entityId: "sensor.printer_pages", name: "Printer pages", area: "Office", state: "ok", value: 2481, stateClass: "total_increasing", lastUpdated: "10:12" },
    history: day([2444, 2444, 2444, 2444, 2444, 2444, 2444, 2444, 2452, 2470, 2481], 2481),
  },
  /** Reachable, but no reading has come in yet. */
  waiting: {
    entity: { entityId: "sensor.porch_illuminance", name: "Porch light level", area: "Outside", state: "ok", unit: "lx", deviceClass: "illuminance", stateClass: "measurement" },
    history: day(Array<Reading>(11).fill(null), null),
  },
  unavailable: {
    entity: { entityId: "sensor.workshop_power", name: "Workshop", area: "Garage", state: "unavailable", unit: "W", deviceClass: "power", stateClass: "measurement", lastSeen: "08:20" },
    history: day([40, 38, 38, 37, 38, 40, 41, 40, "unavailable", "unavailable", "unavailable"], "unavailable"),
  },
  /** Worst case: a name and an area long enough to truncate at every width, and a huge value (break-ui skill). */
  long: {
    entity: { entityId: "sensor.basement_bulkhead_energy", name: "Basement bulkhead door to the garden stairs heat pump", area: "Utility room behind the laundry and boiler", state: "ok", value: 12345.678, unit: "kWh", deviceClass: "energy", stateClass: "total_increasing", lastUpdated: "Fri 18:30" },
    history: day([12321.4, 12322.1, 12322.9, 12323.8, 12325.0, 12327.3, 12330.6, 12334.2, 12338.0, 12341.5, 12344.1], 12345.678),
  },
} satisfies Record<string, NumericSeed>;

export type NumericSeedName = keyof typeof NUMERIC_SEEDS;

/**
 * Worst-case data: the card's Worst case story and each skin's Foundations → Worst case draw these. The widest figure
 * that needs no scaling with a three-letter unit, a huge value scaled ("1.2M"), a large negative one, a one-letter name with no unit, no class, no area and no history, a non-Latin name and area
 * with a long unit, a raw float with more decimals than a card shows, zero, the longest warning word ("High
 * humidity") on a long name and area with a band set, and one gone and never seen.
 */
export const NUMERIC_WORST_CASE: NumericSeed[] = [
  NUMERIC_SEEDS.long,
  {
    entity: { entityId: "sensor.mains_water_total", name: "Mains water", area: "Utility room", state: "ok", value: 1234567.8, unit: "L", deviceClass: "water", stateClass: "total_increasing", lastUpdated: "11:52" },
    history: day([1234012, 1234012, 1234012, 1234012, 1234012, 1234020, 1234188, 1234301, 1234390, 1234455, 1234530], 1234567.8),
  },
  {
    entity: { entityId: "sensor.solar_inverter_grid_feed", name: "Solar inverter grid feed", area: "Roof", state: "ok", value: -12345.6, unit: "W", deviceClass: "power", stateClass: "measurement", lastUpdated: "11:54" },
    history: day([0, 0, 0, 0, 0, 0, -820, -4100, -8900, -11800, -12600], -12345.6),
  },
  {
    entity: { entityId: "sensor.x", name: "X", state: "ok", value: 3 },
    history: day(Array<Reading>(11).fill(null), 3),
  },
  {
    entity: { entityId: "sensor.qualite_de_l_air_sejour", name: "Qualité de l’air — séjour côté véranda", area: "Séjour et salle à manger du rez-de-chaussée", state: "ok", value: 12.4567, unit: "µg/m³", deviceClass: "pm25", stateClass: "measurement", lastUpdated: "11:41" },
    history: day([8.1, 7.9, 7.4, 7.2, 7.0, 7.3, 9.8, 14.6, 18.2, 15.1, 13.3], 12.4567),
  },
  {
    entity: { entityId: "sensor.heat_pump_power", name: "Heat pump", area: "Garden", state: "ok", value: 0, unit: "kW", deviceClass: "power", stateClass: "measurement", lastUpdated: "11:30" },
    history: day([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], 0),
  },
  {
    entity: { entityId: "sensor.bathroom_extractor_humidity", name: "Bathroom extractor fan humidity above the shower", area: "Upstairs family bathroom and laundry", state: "ok", value: 88.4, unit: "%", deviceClass: "humidity", stateClass: "measurement", lastUpdated: "11:48", warnBelow: 30, warnAbove: 70 },
    history: day([52, 51, 50, 50, 49, 49, 71, 93, 90, 84, 86], 88.4),
  },
  {
    entity: { entityId: "sensor.cellar_co2", name: "Cellar CO₂", area: "Basement", state: "unavailable", unit: "ppm", deviceClass: "carbon_dioxide", stateClass: "measurement" },
    history: day(Array<Reading>(11).fill("unavailable"), "unavailable"),
  },
];
