import type { Metadata } from "next";
import Link from "next/link";
import { Suspense, ViewTransition } from "react";
import { PlayScene } from "@/components/match/MatchMoment";
import { PlayerSearch } from "@/components/PlayerSearch";
import { eur } from "@/lib/format";
import { LEAGUES, PAGE_SIZE, POSITIONS, listPlayers, type ListFilters } from "@/lib/queries";

export const metadata: Metadata = { title: "Players" };

function one(v: string | string[] | undefined): string | null {
  const s = (Array.isArray(v) ? v[0] : v)?.trim();
  return s ? s : null;
}

function parseFilters(sp: Record<string, string | string[] | undefined>): ListFilters {
  const league = one(sp.league);
  const position = one(sp.position);
  const page = Number.parseInt(one(sp.page) ?? "1", 10);
  return {
    q: one(sp.q)?.slice(0, 60) ?? null,
    league: league && (LEAGUES as readonly string[]).includes(league) ? league : null,
    position: position && (POSITIONS as readonly string[]).includes(position) ? position : null,
    page: Number.isFinite(page) && page >= 1 && page <= 1000 ? page : 1,
  };
}

function pageHref(f: ListFilters, page: number): string {
  const p = new URLSearchParams();
  if (f.q) p.set("q", f.q);
  if (f.league) p.set("league", f.league);
  if (f.position) p.set("position", f.position);
  if (page > 1) p.set("page", String(page));
  const s = p.toString();
  return s ? `/players?${s}` : "/players";
}

export default function PlayersPage({ searchParams }: PageProps<"/players">) {
  return (
    <div className="flex flex-col gap-8">
      <h1 className="font-display text-5xl font-bold tracking-tight text-pitch">Players</h1>
      <Suspense fallback={<p className="text-muted">Loading players…</p>}>
        <Results searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Results({ searchParams }: Pick<PageProps<"/players">, "searchParams">) {
  const f = parseFilters(await searchParams);
  const { rows, total } = await listPlayers(f);
  const offset = (f.page - 1) * PAGE_SIZE;
  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const filtered = Boolean(f.q || f.league || f.position);

  return (
    <>
      {/* A search (or filter) gets a match moment: goal if anything matched, a save if not. */}
      {filtered && f.page === 1 && (
        <PlayScene
          scene={rows.length ? "goal" : "save"}
          caption={
            rows.length
              ? `Goal! ${total.toLocaleString("en-GB")} ${total === 1 ? "player" : "players"} found.`
              : `Saved! No player matched${f.q ? ` “${f.q}”` : " those filters"}.`
          }
        />
      )}
      <PlayerSearch q={f.q} league={f.league} position={f.position} showFilters />

      {rows.length === 0 ? (
        <div className="flex flex-col items-start gap-2">
          <p className="text-lg">
            No players match{f.q ? ` “${f.q}”` : " these filters"}. Check the spelling, or try a
            shorter part of the name.
          </p>
          {filtered && (
            <Link href="/players" className="font-medium text-pitch underline underline-offset-4">
              Clear search and filters
            </Link>
          )}
        </div>
      ) : (
        <>
          <p className="text-sm text-muted">
            {total.toLocaleString("en-GB")} players, ordered by market value. Showing{" "}
            {offset + 1}–{offset + rows.length}. The small bar shows the five-year range against
            today&apos;s value (the dark tick).
          </p>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b-2 border-pitch text-sm text-muted">
                  <th scope="col" className="w-10 py-2 pr-2 font-medium">
                    #
                  </th>
                  <th scope="col" className="py-2 pr-4 font-medium">
                    Player
                  </th>
                  <th scope="col" className="hidden py-2 pr-4 font-medium md:table-cell">
                    Position
                  </th>
                  <th scope="col" className="hidden py-2 pr-4 text-right font-medium sm:table-cell">
                    Age
                  </th>
                  <th scope="col" className="py-2 pr-4 text-right font-medium">
                    Value
                  </th>
                  <th scope="col" className="py-2 text-right font-medium">
                    In 5 years <span className="font-normal">(estimate)</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.id} className="row-hover border-b border-rule align-top">
                    <td className="py-3 pr-2 text-muted">{offset + i + 1}</td>
                    <td className="py-3 pr-4">
                      <Link
                        href={`/players/${r.id}`}
                        className="font-semibold text-ink underline-offset-4 hover:text-pitch hover:underline"
                      >
                        <ViewTransition name={`player-name-${r.id}`} share="name-morph" default="none">
                          <span>{r.name}</span>
                        </ViewTransition>
                      </Link>
                      <div className="text-sm text-muted">
                        {r.club ?? "Club unknown"}
                        {!f.league && <>, {r.league}</>}
                      </div>
                    </td>
                    <td className="hidden py-3 pr-4 md:table-cell">
                      {r.sub_position ?? r.position ?? "Unknown"}
                    </td>
                    <td className="hidden py-3 pr-4 text-right sm:table-cell">{r.age ?? "?"}</td>
                    <td className="py-3 pr-4 text-right font-semibold">{eur(r.value)}</td>
                    <td className="py-3 text-right">
                      {r.mid == null || r.low == null || r.high == null ? (
                        <span className="text-muted">No estimate</span>
                      ) : (
                        <>
                          <div className="font-semibold text-flood">{eur(r.mid)}</div>
                          <div className="text-sm whitespace-nowrap text-muted">
                            {eur(r.low)} to {eur(r.high)}
                          </div>
                          <RangeBar now={r.value} low={r.low} mid={r.mid} high={r.high} />
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {lastPage > 1 && (
            <nav aria-label="Pages" className="flex items-center justify-between gap-4">
              {f.page > 1 ? (
                <Link href={pageHref(f, f.page - 1)} className="font-medium text-pitch underline underline-offset-4">
                  Previous page
                </Link>
              ) : (
                <span />
              )}
              <span className="text-sm text-muted">
                Page {f.page} of {lastPage}
              </span>
              {f.page < lastPage ? (
                <Link href={pageHref(f, f.page + 1)} className="font-medium text-pitch underline underline-offset-4">
                  Next page
                </Link>
              ) : (
                <span />
              )}
            </nav>
          )}
        </>
      )}
    </>
  );
}

/**
 * Static mini-chart: the 10-90% estimate range against today's value, on a shared
 * log scale (÷10 to ×10), so rows can be compared at a glance. Tick = today.
 */
function RangeBar({ now, low, mid, high }: { now: number; low: number; mid: number; high: number }) {
  const pos = (v: number) => Math.min(100, Math.max(0, ((Math.log10(v / now) + 1) / 2) * 100));
  return (
    <div aria-hidden className="relative mt-1.5 ml-auto h-2 w-28">
      <div className="absolute inset-y-[3px] right-0 left-0 rounded-full bg-rule" />
      <div
        className="absolute inset-y-0 rounded-full bg-flood-fill/60"
        style={{ left: `${pos(low)}%`, width: `${Math.max(pos(high) - pos(low), 2)}%` }}
      />
      <div className="absolute inset-y-0 w-0.5 bg-flood" style={{ left: `${pos(mid)}%` }} />
      <div className="absolute -inset-y-0.5 left-1/2 w-px bg-ink" />
    </div>
  );
}
