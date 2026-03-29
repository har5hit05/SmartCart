import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
    connectionString: `postgresql://${process.env.DATABASE_USER}:${process.env.DATABASE_PASSWORD}@${process.env.DATABASE_HOST}:${process.env.DATABASE_PORT}/${process.env.DATABASE_NAME}`,
});

async function runMigrations() {
    const migrationsDir = path.join(__dirname, 'migrations');
    const files = fs.readdirSync(migrationsDir)
        .filter((f) => f.endsWith('.sql'))
        .sort();

    console.log(`Found ${files.length} migration files\n`);

    // Create updated_at trigger function first (required by migrations)
    await pool.query(`
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = CURRENT_TIMESTAMP;
            RETURN NEW;
        END;
        $$ language 'plpgsql';
    `);

    for (const file of files) {
        console.log(`Running migration: ${file}`);
        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
        try {
            await pool.query(sql);
            console.log(`  ✓ ${file} completed\n`);
        } catch (error: any) {
            if (error.message?.includes('already exists')) {
                console.log(`  ⊘ ${file} skipped (already applied)\n`);
            } else {
                console.error(`  ✗ ${file} failed:`, error.message);
            }
        }
    }

    console.log('All migrations complete!');
    await pool.end();
}

runMigrations().catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
});
