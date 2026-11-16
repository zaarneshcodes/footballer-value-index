// "The Scout": the chatbot's avatar. An original cartoon footballer in
// Barcelona-style blue and garnet stripes with number 19: a young winger with a
// curly top. Not a likeness of any real player (no traced face, no club crest or
// sponsor). Decorative only (aria-hidden): the name is in the text.
import { useId } from "react";

const BLUE = "#004d98";
const GARNET = "#a50044";
const SKIN = "#b5794f";
const HAIR = "#1d1410";

export function ScoutAvatar({ className = "", thinking = false }: { className?: string; thinking?: boolean }) {
  // Unique clip ids, so several avatars on one page don't share definitions.
  const id = useId().replace(/:/g, "");
  return (
    <svg
      viewBox="0 0 64 64"
      aria-hidden
      className={`scout ${thinking ? "scout-thinking" : ""} ${className}`}
    >
      <defs>
        <clipPath id={`${id}-c`}>
          <circle cx="32" cy="32" r="31" />
        </clipPath>
        <clipPath id={`${id}-s`}>
          <path d="M8 66c0-14 9-20 24-20s24 6 24 20z" />
        </clipPath>
      </defs>
      <circle cx="32" cy="32" r="31" fill="var(--sheet)" stroke="var(--pitch)" strokeWidth="2" />
      <g clipPath={`url(#${id}-c)`}>
        <g className="scout-body">
          {/* Shirt: vertical stripes, blue collar and a gold number. */}
          <g clipPath={`url(#${id}-s)`}>
            <rect x="0" y="40" width="64" height="30" fill={GARNET} />
            {[11.5, 29, 46.5].map((x) => (
              <rect key={x} x={x} y="40" width="8.75" height="30" fill={BLUE} />
            ))}
          </g>
          <path d="M26 46.5l6 5 6-5" fill="none" stroke={BLUE} strokeWidth="2.6" strokeLinejoin="round" />
          <text
            x="32"
            y="61.5"
            textAnchor="middle"
            fontFamily="var(--font-barlow-condensed), sans-serif"
            fontWeight="700"
            fontSize="10"
            fill="#f5d36b"
            stroke="#3a0d1c"
            strokeWidth="0.6"
            paintOrder="stroke"
          >
            19
          </text>
          {/* Neck and head. */}
          <rect x="28.5" y="38" width="7" height="8" rx="3" fill={SKIN} />
          <ellipse cx="32" cy="29.5" rx="9.6" ry="11.4" fill={SKIN} />
          <ellipse cx="22.5" cy="30.5" rx="1.7" ry="2.5" fill={SKIN} />
          <ellipse cx="41.5" cy="30.5" rx="1.7" ry="2.5" fill={SKIN} />
          {/* High curly top. */}
          <g fill={HAIR}>
            <path d="M23.4 23.4c0-6 3.8-9.4 8.6-9.4s8.6 3.4 8.6 9.4c-2.6-1.6-5.4-2.2-8.6-2.2s-6 .6-8.6 2.2z" />
            {[
              [24.6, 17.6, 2.9], [28.2, 14.6, 3.1], [32.2, 13.4, 3.2], [36.2, 14.6, 3.1],
              [39.6, 17.6, 2.9], [26.4, 20.4, 2.4], [30.4, 18.2, 2.6], [34.2, 18.2, 2.6], [37.8, 20.4, 2.4],
            ].map(([cx, cy, r]) => (
              <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} />
            ))}
          </g>
          {/* Face: blinking eyes, brows, smile. */}
          <g className="scout-eyes">
            <ellipse cx="28" cy="29.5" rx="1.3" ry="1.6" fill={HAIR} />
            <ellipse cx="36" cy="29.5" rx="1.3" ry="1.6" fill={HAIR} />
          </g>
          <path d="M26.4 26.6h3.2M34.4 26.6h3.2" stroke={HAIR} strokeWidth="1.1" strokeLinecap="round" />
          <path d="M28.6 34.4c1.8 1.6 5 1.6 6.8 0" fill="none" stroke="#5a2f1c" strokeWidth="1.3" strokeLinecap="round" />
        </g>
      </g>
    </svg>
  );
}
