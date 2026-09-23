import type { ReactNode } from "react";

/**
 * The golf crew's header: a hole seen from the tee at golden hour. Pure SVG, painted entirely from the
 * .golf theme variables, so it is dusk on the dark theme and a bright morning on the light one with no
 * second drawing. Every element is laid out in a fixed 800×260 scene and cropped from the middle on
 * narrow screens, so the green and its flag sit where a phone still shows them.
 */

// A small seeded generator: the tree line is procedural but must render identically on every request.
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Tree = { x: number; y: number; r: number; tall: boolean };

function treeLine(seed: number, baseY: number, step: number, rMin: number, rMax: number): Tree[] {
  const r = rng(seed);
  const out: Tree[] = [];
  for (let x = -12; x < 820; x += step * (0.7 + r() * 0.6)) {
    const radius = rMin + r() * (rMax - rMin);
    // A gentle swell in the canopy so it reads as woodland, not a hedge.
    const swell = Math.sin(x / 90) * 5 + Math.sin(x / 37) * 2;
    out.push({ x, y: baseY - radius * 0.55 - swell, r: radius, tall: r() > 0.9 });
  }
  return out;
}

const FAR = treeLine(7, 150, 13, 8, 15);
const NEAR = treeLine(19, 160, 16, 9, 17);

const f = (v: string) => ({ fill: `var(${v})` });
const s = (v: string, w = 1) => ({ stroke: `var(${v})`, strokeWidth: w, fill: "none" });

export function CourseBanner({ children }: { children: ReactNode }) {
  return (
    <div className="relative -mx-4 mb-4 sm:mx-0 sm:rounded-[var(--radius-lg)] overflow-hidden h-[236px] sm:h-[276px] sm:border sm:border-line">
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 260" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id="gf-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" style={{ stopColor: "var(--gf-sky-top)" }} />
            <stop offset="0.55" style={{ stopColor: "var(--gf-sky-mid)" }} />
            <stop offset="1" style={{ stopColor: "var(--gf-sky-low)" }} />
          </linearGradient>
          <radialGradient id="gf-glow" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" style={{ stopColor: "var(--gf-sun-glow)" }} />
            <stop offset="1" style={{ stopColor: "var(--gf-sun-glow)", stopOpacity: 0 }} />
          </radialGradient>
          <linearGradient id="gf-fade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" style={{ stopColor: "var(--ground)", stopOpacity: 0 }} />
            <stop offset="1" style={{ stopColor: "var(--ground)", stopOpacity: 0.95 }} />
          </linearGradient>
          <linearGradient id="gf-water" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" style={{ stopColor: "var(--gf-water-2)", stopOpacity: 0.55 }} />
            <stop offset="1" style={{ stopColor: "var(--gf-water)" }} />
          </linearGradient>
          {/* Mowing stripes: alternating cut directions, the signature of a groomed fairway. */}
          <pattern id="gf-stripes" patternUnits="userSpaceOnUse" width="34" height="34" patternTransform="rotate(-24)">
            <rect width="17" height="34" style={f("--gf-fairway-2")} />
          </pattern>
          <clipPath id="gf-fairway-clip">
            <path d="M-20 262 C 110 232 220 206 330 193 C 400 185 440 180 468 179 C 520 177 566 184 610 198 C 530 216 430 236 372 262 Z" />
          </clipPath>
        </defs>

        {/* Sky, sun and weather */}
        <rect width="800" height="260" fill="url(#gf-sky)" />
        <circle cx="566" cy="126" r="120" fill="url(#gf-glow)" className="gf-sun" />
        <circle cx="566" cy="126" r="24" style={f("--gf-sun")} className="gf-sun" />
        <g className="gf-cloud" style={f("--gf-cloud")}>
          <ellipse cx="190" cy="54" rx="46" ry="11" />
          <ellipse cx="220" cy="46" rx="30" ry="12" />
          <ellipse cx="168" cy="50" rx="22" ry="8" />
          <ellipse cx="640" cy="40" rx="52" ry="10" />
          <ellipse cx="672" cy="33" rx="28" ry="10" />
          <ellipse cx="420" cy="70" rx="34" ry="7" />
        </g>
        <g style={{ ...s("--gf-band-ink-2", 1.4), strokeLinecap: "round", opacity: 0.45 }}>
          <path d="M520 104 q5 -5 10 0 q5 -5 10 0" />
          <path d="M544 96 q4 -4 8 0 q4 -4 8 0" />
          <path d="M506 112 q3 -3 6 0 q3 -3 6 0" />
        </g>

        {/* Distance: hills and two rows of woodland */}
        <path d="M0 152 C 120 124 220 138 320 130 S 520 112 620 126 S 760 118 800 130 V260 H0 Z" style={f("--gf-hills-far")} />
        <g style={f("--gf-trees-2")}>
          {FAR.map((t, i) => (t.tall ? <ellipse key={i} cx={t.x} cy={t.y - t.r * 0.6} rx={t.r * 0.45} ry={t.r * 1.5} /> : <circle key={i} cx={t.x} cy={t.y} r={t.r} />))}
        </g>
        <g style={f("--gf-trees")}>
          {NEAR.map((t, i) => (t.tall ? <ellipse key={i} cx={t.x} cy={t.y - t.r * 0.5} rx={t.r * 0.5} ry={t.r * 1.6} /> : <circle key={i} cx={t.x} cy={t.y + 4} r={t.r} />))}
          <rect x="-10" y="160" width="820" height="12" />
        </g>

        {/* The rough, then the fairway with its stripes, sweeping up to the green */}
        <path d="M0 176 C 160 160 300 168 420 164 S 660 156 800 170 V260 H0 Z" style={f("--gf-rough")} />
        <path d="M-20 262 C 110 232 220 206 330 193 C 400 185 440 180 468 179 C 520 177 566 184 610 198 C 530 216 430 236 372 262 Z" style={f("--gf-fairway")} />
        <rect x="-20" y="170" width="660" height="100" fill="url(#gf-stripes)" clipPath="url(#gf-fairway-clip)" opacity="0.6" />

        {/* Greenside bunkers: a darker lip, the sand, a couple of rake marks */}
        <ellipse cx="416" cy="192" rx="34" ry="8" style={f("--gf-sand-2")} />
        <ellipse cx="417" cy="194" rx="32" ry="6.6" style={f("--gf-sand")} />
        <path d="M396 194 q20 -3 42 0 M400 197 q16 -2 32 0" style={{ ...s("--gf-sand-2", 0.8), opacity: 0.7 }} />
        <ellipse cx="548" cy="186" rx="20" ry="5" style={f("--gf-sand-2")} />
        <ellipse cx="549" cy="187.2" rx="18.5" ry="4" style={f("--gf-sand")} />

        {/* The green, the hole and the flag */}
        <ellipse cx="480" cy="179" rx="48" ry="10.5" style={f("--gf-green")} />
        <ellipse cx="482" cy="178.2" rx="40" ry="8" style={f("--gf-green-2")} />
        <path d="M489 178 l18 2" style={{ ...s("--gf-trees", 1.2), opacity: 0.35 }} />
        <ellipse cx="489" cy="178.4" rx="3.2" ry="1.3" fill="#0b1a12" />
        <rect x="488.3" y="126" width="1.6" height="52.5" rx="0.8" style={f("--gf-pole")} />
        <path d="M489.9 127 L 516 134.5 L 489.9 142 Z" style={f("--gf-flag")} className="gf-flag" />

        {/* A pond in the foreground, catching the sun, with reeds on the bank */}
        <ellipse cx="690" cy="226" rx="104" ry="18" fill="url(#gf-water)" />
        <ellipse cx="660" cy="222" rx="22" ry="2.2" style={{ ...f("--gf-sun"), opacity: 0.35 }} />
        <path d="M620 228 h26 M676 232 h34 M720 224 h22" style={{ ...s("--gf-water-2", 1), strokeLinecap: "round", opacity: 0.6 }} />
        <g style={{ ...s("--gf-trees", 1.4), strokeLinecap: "round" }}>
          <path d="M594 224 q-2 -12 -6 -18 M598 225 q0 -13 2 -20 M602 226 q2 -10 7 -15" />
          <path d="M786 218 q-2 -12 -6 -18 M790 219 q1 -12 3 -18" />
        </g>

        {/* On the tee: a ball waiting to be struck */}
        <ellipse cx="262" cy="246" rx="11" ry="2.2" fill="#000" opacity="0.25" />
        <path d="M258.5 236 h7 l-1.6 10 h-3.8 Z" fill="#e9e2cf" />
        <circle cx="262" cy="230.5" r="6.4" fill="#fbfaf5" />
        <g fill="#000" opacity="0.12">
          <circle cx="260" cy="228.6" r="0.9" />
          <circle cx="263.2" cy="228" r="0.9" />
          <circle cx="264.4" cy="231.2" r="0.9" />
          <circle cx="261.2" cy="232.4" r="0.9" />
        </g>

        <rect y="186" width="800" height="74" fill="url(#gf-fade)" />
      </svg>
      <div className="relative h-full flex flex-col justify-between px-4 sm:px-5 pt-5 pb-4" style={{ color: "var(--gf-band-ink)" }}>
        {children}
      </div>
    </div>
  );
}
