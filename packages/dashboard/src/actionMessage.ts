import type { HaActionError, HassEntity } from "@scope/core";

export interface ActionMessage { title: string; detail: string }

/**
 * What to tell a person about the latest rejected action, in either UI's recovery row: who didn't respond and
 * what to do. Null when there is nothing to show, or when a wrong alarm code already has its recovery in the
 * open keypad.
 */
export function actionMessage(error: HaActionError | undefined, entity: HassEntity | undefined, canRetry: boolean): ActionMessage | null {
  if (!error || error.translationKey === "invalid_code") return null;

  const rawName = error.entityId?.split(".", 2)[1]?.replaceAll("_", " ") ?? "device";
  const fallbackName = rawName.charAt(0).toUpperCase() + rawName.slice(1);
  const name = typeof entity?.attributes.friendly_name === "string" ? entity.attributes.friendly_name : fallbackName;

  if (error.code === "not_connected") return { title: "Home Assistant is not connected", detail: "The command was not sent. Wait for the connection to return." };
  if (error.code === "transport_unknown") return { title: `${name} may not have changed`, detail: "Check its current state before sending another command." };
  if (error.code === "unsupported" || error.code === "invalid_input") return { title: `${name} can’t do that`, detail: "Open the device in Home Assistant for details." };
  return { title: `${name} didn’t respond`, detail: canRetry ? "Retry the command, or check Home Assistant." : "Check Home Assistant, then try again from the control." };
}
