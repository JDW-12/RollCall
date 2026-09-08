import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement> & { size?: number };
const base = (size: number, p: P) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
  ...p,
});

/* Navigation */
export const IconHome = ({ size = 22, ...p }: P) => (
  <svg {...base(size, p)}><path d="M3 11.5 12 4l9 7.5" /><path d="M5.5 10.5V20h13v-9.5" /><path d="M10 20v-5h4v5" /></svg>
);
export const IconCalendar = ({ size = 22, ...p }: P) => (
  <svg {...base(size, p)}><rect x="3.5" y="5" width="17" height="15" rx="2.5" /><path d="M3.5 10h17M8 3v4M16 3v4" /><path d="M8 14h3" /></svg>
);
export const IconTrophy = ({ size = 22, ...p }: P) => (
  <svg {...base(size, p)}><path d="M7 4h10v5a5 5 0 0 1-10 0V4Z" /><path d="M7 6H4.5a2.5 2.5 0 0 0 0 5H7M17 6h2.5a2.5 2.5 0 0 1 0 5H17" /><path d="M12 14v3M8.5 20h7M10 17h4" /></svg>
);
export const IconCoins = ({ size = 22, ...p }: P) => (
  <svg {...base(size, p)}><ellipse cx="9" cy="7" rx="6" ry="2.5" /><path d="M3 7v5c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5V7" /><path d="M3 12v5c0 1.4 2.7 2.5 6 2.5 1.1 0 2.1-.1 3-.4" /><path d="M14 13.5c1.7-.3 3-1.2 3-2.5" /><circle cx="17" cy="17" r="4" /></svg>
);
export const IconPeople = ({ size = 22, ...p }: P) => (
  <svg {...base(size, p)}><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0" /><circle cx="17" cy="9.5" r="2.5" /><path d="M16 15.5c2.9 0 5.5 2 5.5 4.5" /></svg>
);

/* Sports */
export const IconFootball = ({ size = 22, ...p }: P) => (
  <svg {...base(size, p)}><circle cx="12" cy="12" r="9" /><path d="m12 7 4 3-1.5 4.5h-5L8 10l4-3Z" /><path d="M12 7V3.5M16 10l3.2-1.2M14.5 14.5 16.8 17M9.5 14.5 7.2 17M8 10 4.8 8.8" /></svg>
);
export const IconPadel = ({ size = 22, ...p }: P) => (
  <svg {...base(size, p)}><rect x="6" y="3" width="12" height="12" rx="6" /><path d="M10 15v5M14 15v5M10 20h4" /><path d="M9.5 7h5M9.5 9.5h5M9.5 12h5M10.8 5.5v8M13.2 5.5v8" strokeWidth="1" /></svg>
);
export const IconGolf = ({ size = 22, ...p }: P) => (
  <svg {...base(size, p)}><path d="M9 3v14" /><path d="M9 3.5 17 7l-8 3.5" /><ellipse cx="11" cy="19" rx="6" ry="2.5" /></svg>
);
export const IconGym = ({ size = 22, ...p }: P) => (
  <svg {...base(size, p)}><path d="M3 10v4M21 10v4M5.5 8v8M18.5 8v8" /><rect x="7.5" y="6.5" width="2.5" height="11" rx="1" /><rect x="14" y="6.5" width="2.5" height="11" rx="1" /><path d="M10 12h4" /></svg>
);
export const IconFlag = ({ size = 22, ...p }: P) => (
  <svg {...base(size, p)}><path d="M5 21V4" /><path d="M5 4h13l-2.5 4.5L18 13H5" /><path d="M8.5 4v9M12 4v9M5 7h13M5 10h13" strokeWidth="1" /></svg>
);

/* Status */
export const IconCheck = ({ size = 22, ...p }: P) => (
  <svg {...base(size, p)}><path d="m5 12.5 4.5 4.5L19 7.5" strokeWidth="2.2" /></svg>
);
export const IconX = ({ size = 22, ...p }: P) => (
  <svg {...base(size, p)}><path d="M6 6l12 12M18 6 6 18" /></svg>
);
export const IconClock = ({ size = 22, ...p }: P) => (
  <svg {...base(size, p)}><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></svg>
);
export const IconFlame = ({ size = 22, ...p }: P) => (
  <svg {...base(size, p)}><path d="M12 3c1 3 4 4.5 4 8.5a4 4 0 0 1-8 0c0-1.5.5-2.5 1.2-3.5.3 1 .9 1.6 1.8 2 0-3 .5-5 1-7Z" /></svg>
);
export const IconBolt = ({ size = 22, ...p }: P) => (
  <svg {...base(size, p)}><path d="M13 3 5 13.5h6L10.5 21 19 10.5h-6L13 3Z" /></svg>
);
export const IconShare = ({ size = 22, ...p }: P) => (
  <svg {...base(size, p)}><path d="M12 15V4" /><path d="m8 8 4-4 4 4" /><path d="M5 12v6.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V12" /></svg>
);
export const IconChevron = ({ size = 22, ...p }: P) => (
  <svg {...base(size, p)}><path d="m9 6 6 6-6 6" /></svg>
);
export const IconPlus = ({ size = 22, ...p }: P) => (
  <svg {...base(size, p)}><path d="M12 5v14M5 12h14" /></svg>
);
export const IconAlert = ({ size = 22, ...p }: P) => (
  <svg {...base(size, p)}><path d="M12 4 3 20h18L12 4Z" /><path d="M12 10v4M12 17v.5" /></svg>
);
export const IconWhistle = ({ size = 22, ...p }: P) => (
  <svg {...base(size, p)}><circle cx="8" cy="15" r="4.5" /><path d="M12 12.5 20 8v4l-7.5 2.5" /><path d="M8 15h.01" /></svg>
);
export const IconPin = ({ size = 22, ...p }: P) => (
  <svg {...base(size, p)}><path d="M12 21s-6-5.5-6-11a6 6 0 0 1 12 0c0 5.5-6 11-6 11Z" /><circle cx="12" cy="10" r="2.2" /></svg>
);
export const IconMedal = ({ size = 22, ...p }: P) => (
  <svg {...base(size, p)}><circle cx="12" cy="15" r="5" /><path d="m8.5 10.5-3-7h4l2.5 5M15.5 10.5l3-7h-4L12 8.5" /><path d="M12 13v4M10.5 17h3" /></svg>
);
export const IconArrowUp = ({ size = 22, ...p }: P) => (
  <svg {...base(size, p)}><path d="M12 19V5M6 11l6-6 6 6" /></svg>
);
export const IconArrowDown = ({ size = 22, ...p }: P) => (
  <svg {...base(size, p)}><path d="M12 5v14M6 13l6 6 6-6" /></svg>
);

export function SportIcon({ sport, size = 22, className }: { sport: string; size?: number; className?: string }) {
  switch (sport) {
    case "padel":
      return <IconPadel size={size} className={className} />;
    case "golf":
      return <IconGolf size={size} className={className} />;
    case "gym":
      return <IconGym size={size} className={className} />;
    case "motorsport":
      return <IconFlag size={size} className={className} />;
    default:
      return <IconFootball size={size} className={className} />;
  }
}
