import { eitherWay } from "../../entities/assumed";
import type { Unsure } from "../../entities/assumed";

/**
 * `onTurnOn` and `onTurnOff` for an entity whose state Home Assistant only assumes, or doesn't know yet (`eitherWay`):
 * `turn_on` and `turn_off` whatever it shows, since a press that flips what it shows may do the opposite of what was
 * meant. Nothing for any other entity, so a card draws them only then.
 */
export function eitherWayHandlers(entity: Unsure, run: (service: string) => unknown, actionable: () => boolean): { onTurnOn?: () => void; onTurnOff?: () => void } {
  if (!eitherWay(entity)) return {};
  return {
    onTurnOn: () => {
      if (actionable()) run("turn_on");
    },
    onTurnOff: () => {
      if (actionable()) run("turn_off");
    },
  };
}
