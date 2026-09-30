// Keep the deadline in Node: a busy browser can leave page.evaluate pending,
// so a deadline checked only between evaluations does not bound the wait.
export async function waitForBrowserCondition(page, predicate, argument, {timeoutMs = 120000, pollingMs = 200} = {}) {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) throw new RangeError('timeoutMs must be a positive finite number.');
  if (!Number.isFinite(pollingMs) || pollingMs < 0) throw new RangeError('pollingMs must be a nonnegative finite number.');
  const deadline = performance.now() + timeoutMs;
  const timeoutError = () => new Error(`Timed out after ${timeoutMs}ms waiting for a resolved browser condition.`);
  let deadlineTimer, pollingTimer;
  const expired = new Promise((_, reject) => { deadlineTimer = setTimeout(() => reject(timeoutError()), timeoutMs); });
  try {
    while (true) {
      if (performance.now() >= deadline) throw timeoutError();
      let value;
      try { value = await Promise.race([page.evaluate(predicate, argument), expired]); }
      catch (error) {
        // Only a disappearing navigation context is retryable. Closed pages,
        // predicate failures and other browser errors remain real failures.
        if (!/Execution context was destroyed|Cannot find context with specified id|Cannot find context with id/i.test(error?.message || '')) throw error;
      }
      const remaining = deadline - performance.now();
      if (remaining <= 0) throw timeoutError();
      if (value === true) return;
      if (pollingMs >= remaining) await expired;
      await Promise.race([
        new Promise(resolve => { pollingTimer = setTimeout(resolve, pollingMs); }),
        expired,
      ]);
    }
  } finally {
    clearTimeout(deadlineTimer);
    clearTimeout(pollingTimer);
  }
}
