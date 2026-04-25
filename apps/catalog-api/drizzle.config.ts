import 'dotenv/config';
import type { Config } from 'drizzle-kit';

export default {
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgres://bedrock:dev@localhost:5432/bedrock',
  },
  strict: true,
  verbose: true,
} satisfies Config;
