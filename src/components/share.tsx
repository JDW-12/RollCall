"use client";

import { useState } from "react";
import { Button, cls } from "./ui";

/** Share into WhatsApp or copy. WhatsApp's share URL works on mobile and desktop web. */
export function ShareButtons({ text, url, label = "Share to WhatsApp", compact = false }: { text: string; url: string; label?: string; compact?: boolean }) {
  const [copied, setCopied] = useState(false);
  const full = `${text}\n${url}`;
  const wa = `https://wa.me/?text=${encodeURIComponent(full)}`;
  async function copy() {
    try {
      await navigator.clipboard.writeText(full);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      window.prompt("Copy this", full);
    }
  }
  async function native() {
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
        {label}
      </Button>
      <Button type="button" variant="secondary" onClick={copy}>
        {copied ? "Copied" : "Copy link"}
      </Button>
    </div>
  );
}
