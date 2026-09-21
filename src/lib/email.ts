import "server-only";

/**
 * Sends a sign-in code. With RESEND_API_KEY set it goes through Resend's HTTP API.
 * Without it (local dev) the code is printed to the server console, and the UI shows a hint.
 */
export async function sendLoginCode(email: string, code: string): Promise<{ delivered: boolean; dev: boolean }> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.log(`\n[Roll Call] Sign-in code for ${email}: ${code}\n`);
    return { delivered: false, dev: true };
  }
  const from = process.env.EMAIL_FROM ?? "Roll Call <hello@rollcall.club>";
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [email],
      subject: `${code} is your Roll Call code`,
      text: `Your Roll Call sign-in code is ${code}. It expires in 10 minutes.\n\nIf you didn't ask for this, ignore it.`,
    }),
  });
  if (!res.ok) {
    console.error("Resend error", res.status, await res.text());
    return { delivered: false, dev: false };
  }
  return { delivered: true, dev: false };
}

/** Plain-text email through Resend. Logs instead when no key is set. Returns whether it was delivered. */
export async function sendEmail({ to, subject, text }: { to: string; subject: string; text: string }): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.log(`\n[Roll Call] Email to ${to}: ${subject}\n${text}\n`);
    return false;
  }
  const from = process.env.EMAIL_FROM ?? "Roll Call <hello@rollcall.club>";
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [to], subject, text }),
  });
  if (!res.ok) console.error("Resend error", res.status, await res.text());
  return res.ok;
}

export function devEmailMode(): boolean {
  return !process.env.RESEND_API_KEY;
}
