import 'dotenv/config';
import { Pool } from 'pg';

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is required');
  const pool = new Pool({ connectionString: url, max: 1 });

  const tables = ['raw_etl_recharge', 'raw_etl_login', 'raw_etl_logout', 'raw_etl_game_detail', 'raw_std_master_user_profile'];
  for (const t of tables) {
    const r = await pool.query<{ game_id: string; n: string }>(
      `SELECT game_id, count(*)::bigint AS n FROM "${t}" GROUP BY game_id ORDER BY game_id`,
    );
    const summary = r.rows.length
      ? r.rows.map((row) => `${row.game_id}=${Number(row.n).toLocaleString()}`).join(' · ')
      : 'EMPTY';
    // eslint-disable-next-line no-console
    console.log(`${t.padEnd(32)} ${summary}`);
  }

  await pool.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
