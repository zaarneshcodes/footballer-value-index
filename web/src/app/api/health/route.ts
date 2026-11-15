import { connection } from "next/server";
import { sql } from "@/lib/db";

// Read-only check that the app can reach the database. Returns row counts only.
export async function GET() {
  await connection(); // always run at request time, never at build
  try {
    const [row] = await sql()`
      SELECT (SELECT count(*) FROM players)::int      AS players,
             (SELECT count(*) FROM valuations)::int   AS valuations,
             (SELECT count(*) FROM season_stats)::int AS season_stats,
             (SELECT count(*) FROM projections)::int  AS projections`;
    return Response.json({ ok: true, counts: row });
  } catch {
    // Don't echo the error: it could contain connection details.
    return Response.json({ ok: false, error: "database unavailable" }, { status: 503 });
  }
}
