import type { Card } from "@/lib/scout-sop";

// Meme-style reaction cards The Scout can play above an off-topic reply.
// Original drawings (no real-world logos or footage). Each plays one short
// entrance; the CSS lives in globals.css under "Reaction cards".

const LABELS: Record<Card, { title: string; sub: string; aria: string }> = {
  yellow: { title: "Yellow card", sub: "Booked for that tackle", aria: "Reaction: the referee shows a yellow card" },
  red: { title: "Straight red", sub: "Early bath", aria: "Reaction: the referee shows a red card" },
  var: { title: "VAR check", sub: "Searching for football…", aria: "Reaction: VAR check in progress" },
  offside: { title: "Offside", sub: "Flag's up, not in our data", aria: "Reaction: the linesman flags offside" },
  board: { title: "Added relevance", sub: "Fourth official says +0", aria: "Reaction: fourth official board shows plus zero" },
};

function RefCard({ color }: { color: string }) {
  return (
    <g className="rc-raise">
      {/* Referee's black sleeve, hand, and the card held high. */}
      <path d="M30 92 L40 52 L52 54 L46 92 Z" fill="#1b1b1b" stroke="#8a948f" strokeWidth="1.2" />
      <rect x="38" y="48" width="16" height="6" rx="2" fill="#f2c230" />
      <ellipse cx="46" cy="44" rx="7" ry="6.5" fill="#b5794f" />
      <g className="rc-card">
        <rect x="36" y="6" width="24" height="34" rx="2.5" fill={color} transform="rotate(8 48 23)" />
        <rect className="rc-shine" x="36" y="6" width="6" height="34" fill="#fff" opacity="0.35" transform="rotate(8 48 23)" />
      </g>
    </g>
  );
}

function Art({ card }: { card: Card }) {
  switch (card) {
    case "yellow":
      return <RefCard color="#f5c518" />;
    case "red":
      return <RefCard color="#d7263d" />;
    case "var":
      return (
        <g>
          <rect x="10" y="14" width="76" height="52" rx="5" fill="#0d1b2a" stroke="#5b6b7a" strokeWidth="2" />
          <rect x="40" y="66" width="16" height="10" fill="#5b6b7a" />
          <rect x="28" y="76" width="40" height="4" rx="2" fill="#5b6b7a" />
          <text x="48" y="46" textAnchor="middle" fontFamily="var(--font-barlow-condensed), sans-serif" fontWeight="700" fontSize="22" fill="#e6ede9">
            VAR
          </text>
          <rect className="rc-scan" x="12" y="16" width="72" height="3" fill="#7fc7a6" opacity="0.8" />
        </g>
      );
    case "offside":
      return (
        <g>
          <rect x="44" y="18" width="3" height="70" rx="1.5" fill="#d8d8d8" />
          <g className="rc-flag">
            <rect x="47" y="18" width="30" height="22" fill="#f2c230" />
            <path d="M47 18h15v11H47z M62 29h15v11H62z" fill="#d7263d" />
          </g>
          <ellipse cx="45.5" cy="88" rx="8" ry="4" fill="#b5794f" />
        </g>
      );
    case "board":
      return (
        <g className="rc-raise">
          <rect x="34" y="70" width="24" height="22" fill="#1b1b1b" />
          <rect x="8" y="14" width="76" height="56" rx="4" fill="#111" stroke="#444" strokeWidth="2" />
          <text x="46" y="56" textAnchor="middle" fontFamily="var(--font-barlow-condensed), sans-serif" fontWeight="700" fontSize="38" fill="#ff4d4d" className="rc-led">
            +0
          </text>
        </g>
      );
  }
}

export function ReactionCard({ card }: { card: Card }) {
  const l = LABELS[card];
  return (
    <div role="img" aria-label={l.aria} className={`rc rc-${card} flex items-center gap-3 overflow-hidden rounded-lg border border-rule bg-chalk pr-4`}>
      <svg viewBox="0 0 96 92" aria-hidden className="h-20 w-20 shrink-0 bg-[#1d4a39]/10">
        <Art card={card} />
      </svg>
      <div className="min-w-0">
        <p className="rc-title font-display text-2xl leading-none font-bold uppercase">{l.title}</p>
        <p className="mt-1 text-sm text-muted">{l.sub}</p>
      </div>
    </div>
  );
}
