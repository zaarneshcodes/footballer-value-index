import type { CSSProperties } from "react";
import Link from "next/link";
import { eur } from "@/lib/format";
import type { TickerItem } from "@/lib/queries";

function Item({ t, hidden }: { t: TickerItem; hidden?: boolean }) {
  const up = t.mid > t.value;
  return (
    <li className="flex items-baseline gap-2 px-5 whitespace-nowrap">
      <Link
        href={`/players/${t.id}`}
        tabIndex={hidden ? -1 : undefined}
        className="font-semibold underline-offset-4 hover:underline"
      >
        {t.name}
      </Link>
      {t.group === "rising" && t.age != null && <span className="text-muted">age {t.age}</span>}
      <span className="text-muted">{eur(t.value)} now</span>
      <span aria-hidden className="text-muted">
        →
      </span>
      <span className="font-semibold text-flood">
        {eur(t.low)}–{eur(t.high)}
      </span>
      <span className="text-muted">by {t.year}</span>
      <span className={up ? "text-pitch" : "text-[var(--down)]"}>
        <span aria-hidden>{up ? "▲" : "▼"}</span>
        <span className="sr-only">
          middle estimate {eur(t.mid)}, {up ? "above" : "below"} today
        </span>
      </span>
    </li>
  );
}

/**
 * Scrolling strip of five-year estimate ranges: the biggest names, mixed with
 * "ones to watch". A fixed label says these are model estimates, not facts.
 */
export function Ticker({ items }: { items: TickerItem[] }) {
  if (items.length === 0) return null;
  return (
    <section
      aria-label="Five-year value estimates"
      className="fade-in flex items-stretch border-b border-rule bg-sheet text-sm"
      style={{ "--delay": "500ms" } as CSSProperties}
    >
      <Link
        href="/players"
        className="z-10 flex shrink-0 flex-col justify-center border-r border-rule bg-sheet px-4 py-1.5 leading-tight"
      >
        <span className="font-display text-base font-semibold text-flood">5-year estimates</span>
        <span className="hidden text-xs text-muted sm:block">model range, 10–90%</span>
      </Link>
      <div className="ticker min-w-0 flex-1 overflow-hidden py-2.5">
        <div
          className="ticker-track"
          style={{ animationDuration: `${items.length * 6}s` } as CSSProperties}
        >
          <ul className="flex">
            {items.map((t) => (
              <Item key={t.id} t={t} />
            ))}
          </ul>
          {/* Second copy makes the loop seamless; hidden from assistive tech. */}
          <ul className="flex" aria-hidden>
            {items.map((t) => (
              <Item key={t.id} t={t} hidden />
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
