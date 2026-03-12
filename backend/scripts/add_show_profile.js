import pkg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const { Pool } = pkg;
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function migrate() {
    try {
        console.log('Adding show_profile column to live_state...');
        await pool.query('ALTER TABLE public.live_state ADD COLUMN IF NOT EXISTS show_profile BOOLEAN DEFAULT TRUE;');
        console.log('Success!');
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}
migrate();
