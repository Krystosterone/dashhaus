import { useActionStatus } from "@dashhaus/core/lovelace/skin";
import "./ActionStatus.css";

/** One dashboard-level recovery surface for the latest rejected Home Assistant action. */
export function ActionStatus() {
  const status = useActionStatus();
  if (!status) return null;
  const { title, detail, canRetry, retrying } = status;

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
            <button type="button" className="ha-action-b" disabled={retrying} onClick={status.retry}>{retrying ? "Retrying…" : "Retry"}</button>
          )}
          <button type="button" className="ha-action-b" onClick={status.dismiss}>Dismiss</button>
        </span>
      </div>
    </div>
  );
}
