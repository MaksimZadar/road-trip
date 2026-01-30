import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
	console.error('DATABASE_URL is not set');
	process.exit(1);
}

const runMigration = async () => {
	const sql = postgres(databaseUrl, { max: 1 });
	const db = drizzle(sql);

	console.log('Running migrations...');

	try {
		// In production, the drizzle folder will be in the root of the app
		// We'll adjust the path based on where this script is executed
		const migrationsFolder =
			process.env.MIGRATIONS_PATH || path.resolve(__dirname, '../../../../drizzle');

		await migrate(db, { migrationsFolder });
		console.log('Migrations applied successfully!');
	} catch (error) {
		console.error('Migration failed:', error);
		process.exit(1);
	} finally {
		await sql.end();
	}
};

runMigration();
