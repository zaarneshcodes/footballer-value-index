import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ViewTransition } from "react";
import { PlayScene } from "@/components/match/MatchMoment";
import { RollingNumber } from "@/components/RollingNumber";
import { ValueChart } from "@/components/ValueChart";
import { date, eur, monthYear, season } from "@/lib/format";
import { getPlayer, topPlayerIds, type PlayerDetail } from "@/lib/queries";

// Pre-render the first page of the player list (the most visited). Any other player
// renders on first request and is then served from the cache.
export async function generateStaticParams() {
  return (await topPlayerIds(50)).map((id) => ({ id }));
}

async function load(params: PageProps<"/players/[id]">["params"]): Promise<PlayerDetail> {
  const { id } = await params;
  if (!/^\d{1,12}$/.test(id)) notFound();
  const player = await getPlayer(id);
  if (!player) notFound();
  return player;
}

export async function generateMetadata({ params }: PageProps<"/players/[id]">): Promise<Metadata> {
  const p = await load(params);
  return {
    title: p.name,
    description: `${p.name}: market value ${eur(p.value)}, stats and a five-year value estimate.`,
  };
}

export default function PlayerPage({ params }: PageProps<"/players/[id]">) {
  return (
    <div className="flex flex-col gap-10">
      <Link href="/players" className="self-start font-medium text-pitch underline underline-offset-4">
        All players
      </Link>
      {/* No Suspense here: the page renders in one piece, so the name can morph from the list. */}
      <Player params={params} />
    </div>
  );
}

function Fact({ term, children }: { term: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-sm text-muted">{term}</dt>
      <dd className="font-medium">{children}</dd>
    </div>
  );
}

async function Player({ params }: Pick<PageProps<"/players/[id]">, "params">) {
  const p = await load(params);
  const pr = p.projection;
  const role = p.sub_position ?? p.position;

  return (
    <>
      {/* Match moment: a random scene, with the estimate stated plainly in the caption. */}
      {pr && (
        <PlayScene
          caption={`${p.name}: estimate ${eur(pr.low)}–${eur(pr.high)} by ${pr.projection_date.slice(0, 4)}, ${
            pr.mid > p.value ? "up" : "down"
          } from ${eur(p.value)} today.`}
        />
      )}
      <header className="flex flex-col gap-3">
        {/* Same name as the list link: the name morphs from the row into this heading. */}
        <ViewTransition name={`player-name-${p.id}`} share="name-morph" default="none">
          <h1 className="self-start font-display text-6xl leading-[0.9] font-bold tracking-tight break-words text-pitch sm:text-8xl">
            {p.name}
          </h1>
        </ViewTransition>
        <p className="text-lg">
          {role ? `${role} at ` : "Plays for "}
          {p.club ?? "an unknown club"}, {p.league}
        </p>
      </header>

      <section aria-label="Value" className="grid gap-6 border-y-2 border-pitch py-6 sm:grid-cols-[1fr_1fr_1.6fr]">
        <div>
          <p className="text-sm text-muted">Market value</p>
          <p className="font-display text-5xl font-bold">
            <RollingNumber text={eur(p.value)} delay={150} />
          </p>
          <p className="text-sm text-muted">Transfermarkt, {date(p.value_date)}</p>
        </div>
        <div>
          <p className="text-sm text-muted">Highest value</p>
          <p className="font-display text-5xl font-bold">
            {p.highest_value ? <RollingNumber text={eur(p.highest_value)} delay={230} /> : "Unknown"}
          </p>
        </div>
        <div>
          <p className="text-sm text-muted">
            Estimate for {pr ? monthYear(pr.projection_date) : "five years on"}
          </p>
          {pr ? (
            <>
              <p className="font-display text-5xl font-bold text-flood">
                <RollingNumber text={`${eur(pr.low)} to ${eur(pr.high)}`} delay={300} />
              </p>
              <p className="text-sm text-muted">Middle of the range: {eur(pr.mid)}</p>
            </>
          ) : (
            <p className="font-display text-3xl font-semibold text-muted">No estimate</p>
          )}
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-display text-3xl font-semibold">Value over time</h2>
        <ValueChart name={p.name} history={p.history} projection={pr} />
        {pr && (
          <p className="max-w-prose leading-relaxed text-muted">
            The shaded band is where the model expects the value to be in{" "}
            {monthYear(pr.projection_date)}. When tested on past seasons, about 8 in 10 real
            values landed inside ranges like this, so treat it as a rough guide.
          </p>
        )}
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-display text-3xl font-semibold">Profile</h2>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3 lg:grid-cols-5">
          <Fact term="Age">
            {p.age ?? "Unknown"}
            {p.date_of_birth && <span className="block text-sm font-normal text-muted">Born {date(p.date_of_birth)}</span>}
          </Fact>
          <Fact term="Nationality">{p.country ?? "Unknown"}</Fact>
          <Fact term="Preferred foot">{p.foot ? p.foot[0].toUpperCase() + p.foot.slice(1) : "Unknown"}</Fact>
          <Fact term="Height">{p.height_in_cm ? `${Math.round(p.height_in_cm)} cm` : "Unknown"}</Fact>
          <Fact term="Contract until">
            {p.contract_expiration_date ? date(p.contract_expiration_date) : "Unknown"}
          </Fact>
        </dl>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-display text-3xl font-semibold">League seasons</h2>
        {p.seasons.length === 0 ? (
          <p className="text-muted">No top-five league appearances recorded since 2012/13.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-right">
              <thead>
                <tr className="border-b-2 border-pitch text-sm text-muted">
                  <th scope="col" className="py-2 pr-4 text-left font-medium">Season</th>
                  <th scope="col" className="py-2 pr-4 text-left font-medium">League</th>
                  <th scope="col" className="py-2 pr-4 font-medium">Games</th>
                  <th scope="col" className="py-2 pr-4 font-medium">Minutes</th>
                  <th scope="col" className="py-2 pr-4 font-medium">Goals</th>
                  <th scope="col" className="py-2 pr-4 font-medium">Assists</th>
                  <th scope="col" className="py-2 pr-4 font-medium">Yellow</th>
                  <th scope="col" className="py-2 font-medium">Red</th>
                </tr>
              </thead>
              <tbody>
                {p.seasons.map((s) => (
                  <tr key={`${s.season}-${s.league}`} className="border-b border-rule">
                    <td className="py-2 pr-4 text-left font-medium">{season(s.season)}</td>
                    <td className="py-2 pr-4 text-left whitespace-nowrap">{s.league}</td>
                    <td className="py-2 pr-4">{s.appearances}</td>
                    <td className="py-2 pr-4">{s.minutes.toLocaleString("en-GB")}</td>
                    <td className="py-2 pr-4">{s.goals}</td>
                    <td className="py-2 pr-4">{s.assists}</td>
                    <td className="py-2 pr-4">{s.yellow_cards}</td>
                    <td className="py-2">{s.red_cards}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
