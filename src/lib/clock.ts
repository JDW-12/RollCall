/**
 * Request-time clock for server components. Server components render once per request, so reading
 * the time during render is fine; this wrapper keeps the React Compiler purity lint honest and
 * gives tests one place to stub.
 */
export function nowMs(): number {
  return Date.now();
}
