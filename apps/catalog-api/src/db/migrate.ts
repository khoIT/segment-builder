import 'dotenv/config';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';

// CLI: `pnpm db:migrate` — applies generated SQL files under ./drizzle.
// Drizzle creates a __drizzle_migrations table to track state, so this
// is idempotent and safe to re-run.
async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    // eslint-disable-next-line no-console
    console.error('DATABASE_URL is required (copy .env.example to .env)');
    process.exit(1);
  }
  const pool = new Pool({ connectionString: url, max: 1 });
  const db = drizzle(pool);
  // eslint-disable-next-line no-console
  console.log('[migrate] running migrations from ./drizzle');
  await migrate(db, { migrationsFolder: './drizzle' });
  // eslint-disable-next-line no-console
  console.log('[migrate] done');
  await pool.end();
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[migrate] failed', err);
  process.exit(1);
});
