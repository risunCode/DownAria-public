/**
 * Creates an AbortSignal that automatically aborts after the given timeout.
 * Uses AbortSignal.timeout when available and falls back to AbortController.
 */
export function createTimeoutSignal(ms = 30_000): AbortSignal {
  if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
    return AbortSignal.timeout(ms);
  }

  const controller = new AbortController();
  setTimeout(() => {
    controller.abort(new DOMException('The operation timed out.', 'TimeoutError'));
  }, ms);
  return controller.signal;
}

/**
 * Merges multiple abort signals into a single signal.
 * Uses AbortSignal.any when available and falls back to AbortController.
 */
export function mergeAbortSignals(signals: AbortSignal[]): AbortSignal {
  const uniqueSignals = signals.filter((signal, index) => signals.indexOf(signal) === index);
  if (uniqueSignals.length === 0) {
    throw new Error('mergeAbortSignals requires at least one signal.');
  }
  if (uniqueSignals.length === 1) {
    return uniqueSignals[0] as AbortSignal;
  }

  if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.any === 'function') {
    return AbortSignal.any(uniqueSignals);
  }

  const controller = new AbortController();
  const onAbort = (event: Event) => {
    const signal = event.target as AbortSignal;
    controller.abort(signal.reason ?? new DOMException('The operation was aborted.', 'AbortError'));
    for (const current of uniqueSignals) {
      current.removeEventListener('abort', onAbort);
    }
  };

  for (const signal of uniqueSignals) {
    if (signal.aborted) {
      controller.abort(signal.reason ?? new DOMException('The operation was aborted.', 'AbortError'));
      return controller.signal;
    }
    signal.addEventListener('abort', onAbort, { once: true });
  }

  return controller.signal;
}
