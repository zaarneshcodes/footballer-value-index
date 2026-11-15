import type { CSSProperties } from "react";

const STRIP = [..."01234567890123456789"];

/**
 * Scoreboard-style figure: each digit spins one turn and lands on its value.
 * Screen readers get the plain text; the moving strips are hidden from them.
 * Delays shrink as they go (an eased stagger), so the digits land as one wave.
 */
export function RollingNumber({ text, delay = 0 }: { text: string; delay?: number }) {
  let k = 0;
  return (
    <span className="roll" aria-label={text} role="text">
      {[...text].map((ch, i) => {
        if (!/\d/.test(ch)) {
          return (
            <span key={i} aria-hidden style={{ whiteSpace: "pre" }}>
              {ch}
            </span>
          );
        }
        const d = delay + Math.round(180 * (1 - 0.72 ** k++));
        return (
          <span key={i} className="roll-digit" aria-hidden>
            <span
              className="roll-strip"
              style={{ "--n": Number(ch), "--delay": `${d}ms` } as CSSProperties}
            >
              {STRIP.map((s, j) => (
                <span key={j}>{s}</span>
              ))}
            </span>
          </span>
        );
      })}
    </span>
  );
}
