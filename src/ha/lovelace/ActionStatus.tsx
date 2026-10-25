import { useState } from "react";
import { useHaSelector, useHaStore } from "../provider";
import { actionMessage } from "./actionMessage";
import "./ActionStatus.css";

/** One dashboard-level recovery surface for the latest rejected Home Assistant action. */
export function ActionStatus() {
  const store = useHaStore();
  const error = useHaSelector((snapshot) => snapshot.lastActionError);
  const entity = useHaSelector((snapshot) => error?.entityId ? snapshot.entities[error.entityId] : undefined);
  const [retrying, setRetrying] = useState(false);

  const canRetry = store.canRetryLastAction?.() === true;
  const message = actionMessage(error, entity, canRetry);
  if (!message) return null;
  const { title, detail } = message;

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
