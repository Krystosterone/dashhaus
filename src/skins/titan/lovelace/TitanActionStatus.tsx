import { useActionStatus } from "@dashhaus/dashboard/skin";
import "./TitanActionStatus.css";

/**
 * The latest command Home Assistant rejected, once for the whole page: what failed and what to do, Retry when repeating
 * it is safe, and Dismiss. Every Connected Card's action goes through the shared store, which keeps the rejection, so
 * no Card or adapter wires an error of its own. Restyle it with the skin; keep the alert role and both buttons.
 */
export function TitanActionStatus() {
  const status = useActionStatus();
  if (!status) return null;
  return (
    <div className="titan-action-status" role="alert" aria-label="Home Assistant action failed">
      <p className="titan-action-status-copy"><strong>{status.title}</strong><span>{status.detail}</span></p>
      <div className="titan-action-status-buttons">
        {status.canRetry && <button type="button" className="titan-action" data-tone="confirm" disabled={status.retrying} onClick={status.retry}>{status.retrying ? "Retrying…" : "Retry"}</button>}
        <button type="button" className="titan-action" data-tone="frame" onClick={status.dismiss}>Dismiss</button>
      </div>
    </div>
  );
}
