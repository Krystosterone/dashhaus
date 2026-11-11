import { isRecord } from "./util";

/*
 * Home Assistant's energy preferences: what the person set up on the Energy dashboard (Settings → Dashboards →
 * Energy), read with `energy/get_prefs`. The automatic layouts take the house's own power and energy meters from
 * them (`energySensors` in `@dashhaus/core/lovelace/layout`). Pure: no React, so the layout's types can name it.
 */

/** The websocket command that reads the energy preferences. */
export const ENERGY_PREFS = "energy/get_prefs";

/**
 * One energy source, as far as a dashboard reads it. Home Assistant's own shape, kept raw: the current one gives a
 * grid its meters and power flat (`stat_energy_from`, `stat_energy_to`, `stat_rate`), an older one in `flow_from`,
 * `flow_to` and `power` lists. The home, solar, battery, gas and water give theirs flat. Every id is a statistic id:
 * usually an entity id, an external statistic (`opower:…`) otherwise.
 */
export interface EnergySourcePrefs {
  type: string;
  /** Grid consumption, solar production, a battery's discharge (energy out of it), or gas or water used: a meter. */
  stat_energy_from?: string | null;
  /** Grid return, a battery's charge (energy into it), or the home's whole consumption: a meter, in kWh. */
  stat_energy_to?: string | null;
  /** Power now, in W; gas's and water's flow now. A power config's sensor, once Home Assistant has resolved it. */
  stat_rate?: string | null;
  flow_from?: readonly { stat_energy_from?: string | null; stat_rate?: string | null }[];
  flow_to?: readonly { stat_energy_to?: string | null; stat_rate?: string | null }[];
  power?: readonly { stat_rate?: string | null }[];
}

/** `energy/get_prefs`'s answer: the sources, and the devices and the rest a dashboard doesn't read. */
export interface EnergyPrefs {
  energy_sources: readonly EnergySourcePrefs[];
  device_consumption?: readonly unknown[];
}

/** Something that sends one websocket message and resolves with its result: `connection.sendMessagePromise`. */
export type EnergySend = (message: { type: string }) => Promise<unknown>;

/**
 * The house's energy preferences, or nothing. Nothing when the energy dashboard was never set up (Home Assistant
 * answers `not_found`, "No prefs"), on any other refusal or error (an older Home Assistant without the command), and
 * when the answer isn't the shape it should be. Sources that aren't objects with a `type` are dropped.
 */
export async function readEnergyPrefs(send: EnergySend): Promise<EnergyPrefs | undefined> {
  let answer: unknown;
  try {
    answer = await send({ type: ENERGY_PREFS });
  } catch {
    return undefined;
  }
  if (!isRecord(answer) || !Array.isArray(answer.energy_sources)) return undefined;
  const sources = answer.energy_sources.filter((source): source is EnergySourcePrefs => isRecord(source) && typeof source.type === "string");
  return { ...answer, energy_sources: sources } as EnergyPrefs;
}
