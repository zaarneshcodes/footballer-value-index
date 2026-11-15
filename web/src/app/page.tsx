import type { CSSProperties } from "react";
import Link from "next/link";
import { PlayerSearch } from "@/components/PlayerSearch";
import { RaceChart } from "@/components/RaceChart";
import { Ticker } from "@/components/Ticker";
import { LEAGUES, tickerEstimates, topValueHistories } from "@/lib/queries";

const delay = (ms: number) => ({ "--delay": `${ms}ms` }) as CSSProperties;

// Hero choreography (seen once per visit, so it gets the delight budget):
//   0–120ms   headline lines rise (lead)     260ms intro fades up (support)
//   340ms     search fades up (support)      300ms+ chart lines draw as a wave
//   500ms     estimates ticker fades in, then scrolls   League links: static
export default async function Home() {
  const [estimates, lines] = await Promise.all([tickerEstimates(), topValueHistories()]);

  return (
    <div className="flex flex-col gap-14">
      <div className="-mx-4 -mt-8 sm:mx-[calc(50%-50vw)]">
        <Ticker items={estimates} />
      </div>

      <section className="flex max-w-4xl flex-col gap-7">
        <h1 className="font-display text-[clamp(3rem,9vw,6.5rem)] leading-[0.92] font-bold tracking-tight text-pitch">
          <span className="line-mask">
            <span className="line-rise">What is a footballer</span>
          </span>
          <span className="line-mask">
            <span className="line-rise" style={delay(70)}>
              worth today, and
            </span>
          </span>
          <span className="line-mask">
            <span className="line-rise" style={delay(120)}>
              in five years?
            </span>
          </span>
        </h1>
        <p className="fade-up max-w-prose text-lg leading-relaxed" style={delay(260)}>
          Market values and league stats for current players in the Premier League, LaLiga, Serie
          A, Bundesliga and Ligue 1. Each player also gets a five-year value estimate, shown as a
          range because the future is uncertain.
        </p>
        <div className="fade-up max-w-2xl" style={delay(340)}>
          <PlayerSearch />
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-display text-3xl font-semibold">The top of the market</h2>
        <RaceChart lines={lines} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-3xl font-semibold">Browse a league</h2>
        <ul className="flex flex-wrap gap-2">
          {LEAGUES.map((l) => (
            <li key={l}>
              <Link
                href={`/players?league=${encodeURIComponent(l)}`}
                className="inline-block rounded-md border border-rule bg-sheet px-4 py-2 font-medium hover:border-pitch"
              >
                {l}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
