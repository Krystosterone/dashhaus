import { useActionStatus } from "@dashhaus/dashboard";

/**
 * The latest command Home Assistant rejected, once for the whole page: what failed and what to do, Retry when repeating
 * it is safe, and Dismiss. Every card's action goes through the shared store, which keeps the rejection, so no card or
 * adapter wires an error of its own; without this row a refused tap fails silently. `useActionStatus` is on the main
 * `@dashhaus/dashboard` entry, outside the frozen contract. Restyle it in shared/ui.css; keep the alert role.
 */
export function ActionStatus() {
  const status = useActionStatus();
  if (!status) return null;
  return (
    <div className="__skin__-status" role="alert" aria-label="Home Assistant action failed">
      <p className="__skin__-status-copy">
        <strong>{status.title}</strong>
        <span>{status.detail}</span>
      </p>
      <div className="__skin__-status-buttons">
        {status.canRetry && (
          <button type="button" className="__skin__-action" disabled={status.retrying} onClick={status.retry}>
            {status.retrying ? "Retrying…" : "Retry"}
          </button>
        )}
        <button type="button" className="__skin__-action" onClick={status.dismiss}>Dismiss</button>
      </div>
    </div>
  );
}
