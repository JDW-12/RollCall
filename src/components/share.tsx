"use client";

import { useState } from "react";
import { Button, cls } from "./ui";
import { IconShare } from "./icons";

type Props = {
  text: string;
  url: string;
  label?: string;
  compact?: boolean;
  /** For the pilot dashboard: which crew and what was shared. */
  crewId?: string;
  sessionId?: string;
  what?: "session" | "recap" | "player" | "invite" | "season";
};

function beacon(body: Record<string, unknown>) {
  try {
    const data = JSON.stringify({ kind: "share_click", ...body });
    if (navigator.sendBeacon) navigator.sendBeacon("/api/track", new Blob([data], { type: "application/json" }));
    else fetch("/api/track", { method: "POST", body: data, headers: { "Content-Type": "application/json" }, keepalive: true });
  } catch {
    /* never block a share on analytics */
  }
}

/** Share into WhatsApp or copy. WhatsApp's share URL works on mobile and desktop web. */
export function ShareButtons({ text, url, label = "Share to WhatsApp", compact = false, crewId, sessionId, what }: Props) {
  const [copied, setCopied] = useState(false);
  const full = `${text}\n${url}`;
  const wa = `https://wa.me/?text=${encodeURIComponent(full)}`;
  const log = (via: string) => beacon({ crewId, sessionId, what: `${what ?? "link"}:${via}` });
  async function copy() {
    log("copy");
    try {
      await navigator.clipboard.writeText(full);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      window.prompt("Copy this", full);
    }
  }
  async function native() {
    log("whatsapp");
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ text, url });
        return;
      } catch {
        /* user cancelled */
      }
    }
    window.open(wa, "_blank", "noopener");
  }
  return (
    <div className={cls("flex gap-2", compact ? "" : "flex-wrap")}>
      <Button type="button" onClick={native} className="bg-[#25D366] text-[#0b2f1a] hover:bg-[#1fb257]">
        <IconShare size={18} />
        {label}
      </Button>
      <Button type="button" variant="secondary" onClick={copy}>
        {copied ? "Copied" : "Copy link"}
      </Button>
    </div>
  );
}
