/** Only allow same-site paths for post-login redirects. Blocks //host and /\host tricks. */
export function safeNext(next: string | undefined, fallback = "/home"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}
