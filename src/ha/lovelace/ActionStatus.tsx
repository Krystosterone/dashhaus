import { useState } from "react";
import { useHaSelector, useHaStore } from "../provider";
import "./ActionStatus.css";

/** One dashboard-level recovery surface for the latest rejected Home Assistant action. */
export function ActionStatus() {
  const store = useHaStore();
  const error = useHaSelector((snapshot) => snapshot.lastActionError);
  const entity = useHaSelector((snapshot) => error?.entityId ? snapshot.entities[error.entityId] : undefined);
  const [retrying, setRetrying] = useState(false);

  // A wrong alarm code already has specific, contextual recovery in the open keypad.
  if (!error || error.translationKey === "invalid_code") return null;

  const rawName = error.entityId?.split(".", 2)[1]?.replaceAll("_", " ") ?? "device";
  const fallbackName = rawName.charAt(0).toUpperCase() + rawName.slice(1);
  const friendlyName = typeof entity?.attributes.friendly_name === "string" ? entity.attributes.friendly_name : fallbackName;
  const canRetry = store.canRetryLastAction?.() === true;

  let title = `${friendlyName} didn’t respond`;
  let detail = canRetry ? "Retry the command, or check Home Assistant." : "Check Home Assistant, then try again from the control.";
  if (error.code === "not_connected") {
    title = "Home Assistant is not connected";
    detail = "The command was not sent. Wait for the connection to return.";
  } else if (error.code === "transport_unknown") {
    title = `${friendlyName} may not have changed`;
    detail = "Check its current state before sending another command.";
  } else if (error.code === "unsupported" || error.code === "invalid_input") {
    title = `${friendlyName} can’t do that`;
    detail = "Open the device in Home Assistant for details.";
  }

  return (
    <div className="ha-action-dock">
      <div className="ha-action" role="alert" aria-label="Home Assistant action failed">
        <span className="ha-action-i" aria-hidden="true">
          <svg viewBox="0 0 18 18"><path d="M9 2.25 16 15H2L9 2.25Z" /><path d="M9 6.5v4M9 13h.01" /></svg>
        </span>
        <span className="ha-action-copy">
          <strong>{title}</strong>
          <span>{detail}</span>
        </span>
        <span className="ha-action-buttons">
          {canRetry && (
            <button type="button" className="ha-action-b" disabled={retrying} onClick={() => {
              setRetrying(true);
              void store.retryLastAction?.().catch(() => undefined).finally(() => setRetrying(false));
            }}>{retrying ? "Retrying…" : "Retry"}</button>
          )}
          <button type="button" className="ha-action-b" onClick={() => store.clearActionError?.()}>Dismiss</button>
        </span>
      </div>
    </div>
  );
}
