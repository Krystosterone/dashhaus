/**
 * Named types for the site's API lists where the packages express a shape generically: each headless component's
 * props are `HeadlessProps<typeof useHa<Name>>`. Nothing imports this file; the docs read it and `npm run typecheck`
 * checks it, so a renamed hook fails here first.
 */
import type {
  HeadlessProps,
  useHaAlarm,
  useHaClimate,
  useHaCover,
  useHaHumidifier,
  useHaLight,
  useHaOwlet,
  useHaSensor,
  useHaSound,
  useHaToggle,
  useHaWeather,
} from "@dashhaus/core";

export type HaLightProps = HeadlessProps<typeof useHaLight>;
export type HaClimateProps = HeadlessProps<typeof useHaClimate>;
export type HaCoverProps = HeadlessProps<typeof useHaCover>;
export type HaToggleProps = HeadlessProps<typeof useHaToggle>;
export type HaHumidifierProps = HeadlessProps<typeof useHaHumidifier>;
export type HaSoundProps = HeadlessProps<typeof useHaSound>;
export type HaAlarmProps = HeadlessProps<typeof useHaAlarm>;
export type HaSensorProps = HeadlessProps<typeof useHaSensor>;
export type HaWeatherProps = HeadlessProps<typeof useHaWeather>;
export type HaOwletProps = HeadlessProps<typeof useHaOwlet>;
