export { toCelsius, comfortLabel, trendOf, normalize, fmtTemp, fmtHum, lowBattery, TREND_WORD } from "@scope/core/entities/sensor/readings";
export type { Trend } from "@scope/core/entities/sensor/readings";

const P = { fill: "none", stroke: "currentColor" } as const;
export const IconThermo = () => <svg viewBox="0 0 20 20" aria-hidden="true" {...P}><path d="M8 11.6V4.5a2 2 0 1 1 4 0v7.1a3.5 3.5 0 1 1-4 0Z" /><path d="M10 9v5" /></svg>;
export const IconThermoOff = () => <svg viewBox="0 0 20 20" aria-hidden="true" {...P}><path d="M8 11.6V4.5a2 2 0 1 1 4 0v7.1a3.5 3.5 0 1 1-4 0Z" /><path d="M3.5 3.5l13 13" /></svg>;
