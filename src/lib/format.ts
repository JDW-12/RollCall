const TZ = "Europe/London";

export function pounds(pence: number): string {
  const sign = pence < 0 ? "-" : "";
  const abs = Math.abs(pence);
  const whole = Math.floor(abs / 100);
  const frac = abs % 100;
  if (frac === 0) return `${sign}£${whole}`;
  return `${sign}£${whole}.${String(frac).padStart(2, "0")}`;
}

export function parsePounds(input: string): number | null {
  const cleaned = input.replace(/[£,\s]/g, "");
  if (!/^\d+(\.\d{0,2})?$/.test(cleaned)) return null;
  const [w, f = ""] = cleaned.split(".");
  return Number(w) * 100 + Number((f + "00").slice(0, 2));
}

export function fmtDay(d: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: TZ,
  }).format(d);
}

export function fmtTime(d: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: TZ,
  }).format(d);
}

export function fmtDateTime(d: Date): string {
  return `${fmtDay(d)} · ${fmtTime(d)}`;
}

export function fmtLong(d: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: TZ,
  }).format(d);
}

/** Value for <input type="datetime-local"> in London local time. */
export function toLocalInput(d: Date): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: TZ,
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  const hour = String(Number(get("hour")) % 24).padStart(2, "0");
  return `${get("year")}-${get("month")}-${get("day")}T${hour}:${get("minute")}`;
}

/** Parse a datetime-local string as London local time into a UTC Date. */
export function fromLocalInput(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!m) return null;
  const [, y, mo, d, h, mi] = m.map(Number);
  // Find the UTC instant whose London wall-clock equals the input.
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  const offsetAt = (t: number) => {
    const p = new Intl.DateTimeFormat("en-GB", {
      timeZone: TZ,
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).formatToParts(new Date(t));
    const g = (k: string) => Number(p.find((x) => x.type === k)?.value);
    const wall = Date.UTC(g("year"), g("month") - 1, g("day"), g("hour") % 24, g("minute"));
    return wall - t;
  };
  const off1 = offsetAt(guess);
  const t1 = guess - off1;
  const off2 = offsetAt(t1);
  return new Date(guess - off2);
}

export function relativeDay(d: Date, now = new Date()): string {
  const day = (x: Date) =>
    new Intl.DateTimeFormat("en-GB", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(x);
  const dayMs = 86_400_000;
  if (day(d) === day(now)) return "Today";
  if (day(d) === day(new Date(now.getTime() + dayMs))) return "Tomorrow";
  if (day(d) === day(new Date(now.getTime() - dayMs))) return "Yesterday";
  return fmtDay(d);
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const a = parts[0]?.[0] ?? "?";
  const b = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (a + b).toUpperCase();
}

export function plural(n: number, one: string, many = one + "s"): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** "just now" / "12 minutes ago" / "3 hours ago" / "5 days ago", for freshness lines. */
export function fmtAgo(d: Date, now = new Date()): string {
  const secs = Math.round((now.getTime() - d.getTime()) / 1000);
  if (secs < 90) return "just now";
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${plural(mins, "minute")} ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${plural(hours, "hour")} ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${plural(days, "day")} ago`;
  return fmtDay(d);
}

/** Golf's way of writing a score against par: +22, E for level, −3 under. */
export function fmtToPar(n: number): string {
  const r = Math.round(n);
  if (r === 0) return "E";
  return r > 0 ? `+${r}` : `−${-r}`;
}
