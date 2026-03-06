import pkg from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: "../.env" });

const { Pool } = pkg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function purgeAndSeed() {
    try {
        console.log('🗑️ Purging existing questions...');
        await pool.query('TRUNCATE TABLE public.questions CASCADE');
        console.log('✅ Purge complete.');
    } catch (err) {
        console.error('Error purging table:', err);
    } finally {
        await pool.end();
        process.exit(0);
    }
}

purgeAndSeed();
