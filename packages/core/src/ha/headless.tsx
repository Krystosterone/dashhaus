import type { ReactNode } from "react";
import { useHaLock } from "./hooks/lock";
import { useHaFan } from "./hooks/fan";
import { useHaGuestWifi } from "./hooks/guestWifi";
import { useHaBinarySensor } from "./hooks/binarySensor";
import { useHaNumeric } from "./hooks/numeric";
// new-card: headless imports
import { useHaLight } from "./hooks/light";
import { useHaClimate } from "./hooks/climate";
import { useHaWeather } from "./hooks/weather";
import { useHaSensor } from "./hooks/sensor";
import { useHaCover } from "./hooks/cover";
import { useHaToggle } from "./hooks/toggle";
import { useHaAlarm } from "./hooks/alarm";
import { useHaOwlet } from "./hooks/owlet";
import { useHaHumidifier } from "./hooks/humidifier";
import { useHaSound } from "./hooks/sound";

type LiveHook = (entityId: string, options: never) => unknown;

/** A headless component's props: the entity, the hook's options, and what to draw with its result. */
export type HeadlessProps<H extends LiveHook> = NonNullable<Parameters<H>[1]> & {
  /** The Home Assistant entity id. */
  entityId: string;
  /** Draws the hook's result. The component itself draws nothing. */
  children: (live: ReturnType<H>) => ReactNode;
};

/**
 * A useHa<Kind> hook as a component that draws nothing of its own. A UI renders one per entity, which a
 * list of entities from config needs, since hooks can't be called in a loop:
 * `<HaLight entityId="light.desk">{(light) => <MyLightCard {...light} />}</HaLight>`.
 */
export function headless<H extends LiveHook>(useLive: H, name: string) {
  const useHook = useLive as unknown as (entityId: string, options: object) => ReturnType<H>;
  function Headless(props: HeadlessProps<H>) {
    const { entityId, children, ...options } = props as { entityId: string; children: (live: ReturnType<H>) => ReactNode };
    return <>{children(useHook(entityId, options))}</>;
  }
  Headless.displayName = name;
  return Headless;
}

export const HaLight = headless(useHaLight, "HaLight");
export const HaClimate = headless(useHaClimate, "HaClimate");
export const HaWeather = headless(useHaWeather, "HaWeather");
export const HaSensor = headless(useHaSensor, "HaSensor");
export const HaCover = headless(useHaCover, "HaCover");
export const HaToggle = headless(useHaToggle, "HaToggle");
export const HaAlarm = headless(useHaAlarm, "HaAlarm");
export const HaOwlet = headless(useHaOwlet, "HaOwlet");
export const HaHumidifier = headless(useHaHumidifier, "HaHumidifier");
export const HaSound = headless(useHaSound, "HaSound");
export const HaLock = headless(useHaLock, "HaLock");
export const HaFan = headless(useHaFan, "HaFan");
export const HaGuestWifi = headless(useHaGuestWifi, "HaGuestWifi");
export const HaBinarySensor = headless(useHaBinarySensor, "HaBinarySensor");
export const HaNumeric = headless(useHaNumeric, "HaNumeric");
// new-card: headless components
