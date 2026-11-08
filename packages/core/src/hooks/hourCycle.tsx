import { createContext, useContext } from "react";
import type { ReactNode } from "react";
import { hourCycleOf } from "../entities/clock";
import type { HourCycle } from "../entities/clock";

/** The dashboard's hour cycle, resolved; undefined outside any `HourCycleProvider`. */
const HourCycleContext = createContext<HourCycle | undefined>(undefined);

export interface HourCycleOptions {
  /** 12 or 24 hours, as the dashboard's YAML `hour_cycle` says. */
  hourCycle?: HourCycle;
  /** The locale whose clock to read when no cycle is given (a header's `locale`). */
  locale?: string;
}

/**
 * The hour cycle every time on this dashboard is said on: the one asked for, else `locale`'s, else the nearest
 * `HourCycleProvider`'s, else the browser locale's. A card calls it with nothing; a header passes its own props, so it
 * and the cards under it read one clock.
 */
export function useHourCycle({ hourCycle, locale }: HourCycleOptions = {}): HourCycle {
  const around = useContext(HourCycleContext);
  if (hourCycle) return hourCycle;
  if (locale) return hourCycleOf(locale);
  return around ?? hourCycleOf();
}

export interface HourCycleProviderProps extends HourCycleOptions {
  children: ReactNode;
}

/**
 * One hour cycle for a dashboard: every card under it, and every `useHa<Name>` hook, says its times on it (spec/core.md
 * → One hour cycle per dashboard). A skin's page puts it around its header and cards with the header's `hourCycle`
 * and `locale`; given neither, it keeps the cycle around it, or the browser locale's.
 */
export function HourCycleProvider({ hourCycle, locale, children }: HourCycleProviderProps) {
  const value = useHourCycle({ hourCycle, locale });
  return <HourCycleContext.Provider value={value}>{children}</HourCycleContext.Provider>;
}
