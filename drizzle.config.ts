import { defineConfig } from 'drizzle-kit';

const databaseUrl = process.env.DATABASE_URL || 'postgres://localhost:5432/placeholder';

export default defineConfig({
	schema: './src/lib/server/db/schema.ts',
	dialect: 'postgresql',
	dbCredentials: { url: databaseUrl },
	verbose: true,
	strict: true
});
