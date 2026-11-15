import Link from "next/link";

export default function PlayerNotFound() {
  return (
    <div className="flex flex-col items-start gap-4 py-8">
      <h1 className="font-display text-5xl font-bold tracking-tight text-pitch">Player not found</h1>
      <p className="max-w-prose text-lg">
        There is no player with this ID. The site only lists players currently at clubs in the top
        five European leagues.
      </p>
      <Link href="/players" className="font-medium text-pitch underline underline-offset-4">
        Search all players
      </Link>
    </div>
  );
}
