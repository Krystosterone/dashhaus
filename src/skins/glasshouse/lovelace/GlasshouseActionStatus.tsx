import { useActionStatus } from "@dashhaus/core/lovelace/skin";
import "./GlasshouseActionStatus.css";

/**
 * The latest command Home Assistant rejected, once for the whole page: what failed and what to do, Retry when repeating
 * it is safe, and Dismiss. Every Connected Card's action goes through the shared store, which keeps the rejection, so
 * no Card or adapter wires an error of its own. Restyle it with the skin; keep the alert role and both buttons.
 */
export function GlasshouseActionStatus() {
  const status = useActionStatus();
  if (!status) return null;
  return (
    <div className="glasshouse-action-status" role="alert" aria-label="Home Assistant action failed">
      <p className="glasshouse-action-status-copy"><strong>{status.title}</strong><span>{status.detail}</span></p>
      <div className="glasshouse-action-status-buttons">
        {status.canRetry && <button type="button" className="glasshouse-action" disabled={status.retrying} onClick={status.retry}>{status.retrying ? "Retrying…" : "Retry"}</button>}
        <button type="button" className="glasshouse-action" onClick={status.dismiss}>Dismiss</button>
      </div>
    </div>
  );
}
