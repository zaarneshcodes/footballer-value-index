import { LEAGUES, POSITIONS } from "@/lib/queries";

type Props = {
  q?: string | null;
  league?: string | null;
  position?: string | null;
  showFilters?: boolean;
};

const field =
  "h-11 rounded-md border border-rule bg-sheet px-3 text-ink placeholder:text-muted";

// Plain GET form: works without JavaScript and every search has a shareable URL.
export function PlayerSearch({ q, league, position, showFilters = false }: Props) {
  return (
    <form action="/players" role="search" className="flex flex-wrap items-end gap-3">
      <label className="flex min-w-60 flex-1 flex-col gap-1 text-sm font-medium">
        Player name
        <input
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder="e.g. Saka, Pedri, Musiala"
          className={`${field} text-base font-normal`}
        />
      </label>
      {showFilters && (
        <>
          <label className="flex flex-col gap-1 text-sm font-medium">
            League
            <select name="league" defaultValue={league ?? ""} className={`${field} text-base font-normal`}>
              <option value="">All leagues</option>
              {LEAGUES.map((l) => (
                <option key={l}>{l}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Position
            <select name="position" defaultValue={position ?? ""} className={`${field} text-base font-normal`}>
              <option value="">All positions</option>
              {POSITIONS.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </label>
        </>
      )}
      <button
        type="submit"
        className="h-11 rounded-md bg-pitch px-5 font-semibold text-chalk hover:opacity-90"
      >
        Search
      </button>
    </form>
  );
}
