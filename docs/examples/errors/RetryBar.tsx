import { useHaSelector, useHaStore } from "@dashhaus/core";

/**
 * One bar for the whole dashboard: the store keeps the latest failed action, and offers it again only when a repeat
 * is safe on this connection (an alarm code is never kept).
 */
export function RetryBar() {
  const store = useHaStore();
  const error = useHaSelector((snapshot) => snapshot.lastActionError);
  if (!error) return null;
  return (
    <div role="alert">
      {error.domain ? `${error.domain}.${error.service ?? "call"} failed.` : "An action failed."}
      {error.retryable && store.canRetryLastAction?.() && (
        <button type="button" onClick={() => void store.retryLastAction?.().catch(() => undefined)}>
          Try again
        </button>
      )}
      <button type="button" onClick={() => store.clearActionError?.()}>
        Dismiss
      </button>
    </div>
  );
}
