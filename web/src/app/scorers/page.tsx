import type { Metadata } from "next";
import { Suspense } from "react";
import { Leaderboard } from "@/components/Leaderboard";

export const metadata: Metadata = { title: "Top scorers" };

export default function ScorersPage({ searchParams }: PageProps<"/scorers">) {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <h1 className="font-display text-5xl font-bold tracking-tight text-pitch">Golden Boot race</h1>
        <p className="max-w-prose leading-relaxed text-muted">
          Most league goals in each of the top five leagues. This page refreshes itself whenever the
          dataset is reloaded. It only counts players who are in these leagues now, so anyone who
          has since moved abroad is missing.
        </p>
      </div>
      <Suspense fallback={<p className="text-muted">Loading scorers…</p>}>
        <Board searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Board({ searchParams }: Pick<PageProps<"/scorers">, "searchParams">) {
  const { season } = await searchParams;
  return <Leaderboard stat="goals" seasonParam={season} />;
}
