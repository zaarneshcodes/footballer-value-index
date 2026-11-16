import type { Metadata } from "next";
import { Suspense } from "react";
import { Leaderboard } from "@/components/Leaderboard";

export const metadata: Metadata = { title: "Top assists" };

export default function AssistsPage({ searchParams }: PageProps<"/assists">) {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <h1 className="font-display text-5xl font-bold tracking-tight text-pitch">Playmaker race</h1>
        <p className="max-w-prose leading-relaxed text-muted">
          Most league assists in each of the top five leagues: the players setting everyone else
          up. Refreshes whenever the dataset is reloaded. Only players who are in these leagues now
          are counted, so anyone who has since moved abroad is missing.
        </p>
      </div>
      <Suspense fallback={<p className="text-muted">Loading assists…</p>}>
        <Board searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Board({ searchParams }: Pick<PageProps<"/assists">, "searchParams">) {
  const { season } = await searchParams;
  return <Leaderboard stat="assists" seasonParam={season} />;
}
