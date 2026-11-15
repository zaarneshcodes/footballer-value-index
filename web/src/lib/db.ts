import "server-only";
import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

// Read-side access to the Neon database. The connection string comes only
// from the DATABASE_URL environment variable and is never logged or returned.
let client: NeonQueryFunction<false, false> | null = null;

export function sql(): NeonQueryFunction<false, false> {
  if (!client) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    client = neon(url);
  }
  return client;
}
