import type { CSSProperties } from "react";
import Link from "next/link";
import { eur } from "@/lib/format";
import type { Move } from "@/lib/queries";

function Item({ m, hidden }: { m: Move; hidden?: boolean }) {
  const up = m.value > m.prev;
  return (
    <li className="flex items-baseline gap-2 px-5 whitespace-nowrap">
      <Link
        href={`/players/${m.id}`}
        tabIndex={hidden ? -1 : undefined}
        className="font-semibold underline-offset-4 hover:underline"
      >
        {m.name}
      </Link>
      <span className="text-muted">{eur(m.value)}</span>
      <span className={up ? "text-pitch" : "text-[var(--down)]"}>
        <span aria-hidden>{up ? "▲" : "▼"}</span>
        <span className="sr-only">{up ? "up" : "down"}</span> {eur(Math.abs(m.value - m.prev))}
      </span>
    </li>
  );
}

/** Market-ticker strip of the biggest moves in the latest Transfermarkt update. */
export function Ticker({ moves }: { moves: Move[] }) {
  if (moves.length === 0) return null;
  return (
    <section
      aria-label="Biggest value changes in the latest update"
      className="ticker fade-in overflow-hidden border-b border-rule bg-sheet py-2.5 text-sm"
      style={{ "--delay": "500ms" } as CSSProperties}
    >
      <div className="ticker-track">
        <ul className="flex">
          {moves.map((m) => (
            <Item key={m.id} m={m} />
          ))}
        </ul>
        {/* Second copy makes the loop seamless; hidden from assistive tech. */}
        <ul className="flex" aria-hidden>
          {moves.map((m) => (
            <Item key={m.id} m={m} hidden />
          ))}
        </ul>
      </div>
    </section>
  );
}
