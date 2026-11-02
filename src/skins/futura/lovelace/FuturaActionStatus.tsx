import { useActionStatus } from "@dashhaus/dashboard/skin";
import "./FuturaActionStatus.css";

/**
 * The latest command Home Assistant rejected, once for the whole console: what failed and what to do, Retry when
 * repeating it is safe, and Dismiss. Every Connected Card's action goes through the shared store, which keeps the
 * rejection, so no Card wires an error of its own.
 */
export function FuturaActionStatus() {
  const status = useActionStatus();
  if (!status) return null;
  return (
    <div className="futura-action-status" role="alert" aria-label="Home Assistant action failed">
      <p className="futura-action-status-copy"><strong>{status.title}</strong><span>{status.detail}</span></p>
      <div className="futura-action-status-buttons">
        {status.canRetry && <button type="button" className="futura-action" disabled={status.retrying} onClick={status.retry}>{status.retrying ? "Retrying…" : "Retry"}</button>}
        <button type="button" className="futura-action" onClick={status.dismiss}>Dismiss</button>
      </div>
    </div>
  );
}
