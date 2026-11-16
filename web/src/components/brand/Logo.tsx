import Link from "next/link";

/** A small football: chalk-white with a dark centre panel and seams. */
export function Ball({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <circle cx="12" cy="12" r="11" fill="var(--ball)" stroke="var(--ball-ink)" strokeWidth="1.5" />
      <path d="M12 7.2l4.1 3-1.6 4.8h-5l-1.6-4.8z" fill="var(--ball-ink)" />
      <path
        d="M12 7.2V2.6M16.1 10.2l4.2-1.5M14.5 15l2.6 3.8M9.5 15l-2.6 3.8M7.9 10.2L3.7 8.7"
        stroke="var(--ball-ink)"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Wordmark: the ball is the first "O" of FOOTBALLER. It rolls in on the first
 * page load (kick-off) and spins on hover. Screen readers get the plain name.
 */
export function Logo() {
  return (
    <Link href="/" aria-label="Footballer Value Index, home" className="logo group flex items-baseline gap-2">
      <span aria-hidden className="font-display text-[1.65rem] leading-none font-bold tracking-tight whitespace-nowrap text-[var(--chalk-line)] uppercase italic sm:text-3xl">
        F
        <span className="logo-ball-roll inline-block">
          <Ball className="logo-ball-spin inline-block h-[0.74em] w-[0.74em] align-[-0.04em]" />
        </span>
        otballer
      </span>
      <span aria-hidden className="font-display text-lg leading-none font-semibold text-flood-fill max-[480px]:hidden sm:text-xl">
        Value Index
      </span>
    </Link>
  );
}
