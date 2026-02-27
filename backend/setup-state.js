import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pkg;

// Initialize PostgreSQL Pool
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function setupLiveState() {
    console.log('🔄 Setting up Global Live State routing table...');

    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS public.live_state (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                current_round TEXT NOT NULL DEFAULT 'A',
                current_stage INTEGER NOT NULL DEFAULT 0,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
                timer_end TIMESTAMP WITH TIME ZONE
            );
        `);
        console.log('✅ Table `public.live_state` validated.');

        // Attempt to add timer_end if the table already existed before this commit
        try {
            await pool.query(`ALTER TABLE public.live_state ADD COLUMN timer_end TIMESTAMP WITH TIME ZONE;`);
            console.log('✅ Added `timer_end` column to existing `live_state` table.');
        } catch (err) {
            // Error code 42701 means column already exists
            if (err.code !== '42701') {
                console.error('⚠️ Could not alter live_state:', err.message);
            }
        }
        console.log('✅ Table `public.live_state` validated.');

        // Check if a row already exists
        const res = await pool.query('SELECT COUNT(*) FROM public.live_state');
        const count = parseInt(res.rows[0].count, 10);

        if (count === 0) {
            // Seed the initial state
            await pool.query(`
                INSERT INTO public.live_state (current_round, current_stage) 
                VALUES ('A', 0);
            `);
            console.log('✅ Seeded initial state: Round A, Stage 0');
        } else if (count > 1) {
            console.warn('⚠️ Warning: Multiple rows found in `live_state`. The system relies on exactly 1 row. Purging excess.');
            // Only keep the most recently updated row
            await pool.query(`
                DELETE FROM public.live_state 
                WHERE id NOT IN (
                    SELECT id FROM public.live_state ORDER BY updated_at DESC LIMIT 1
                )
            `);
            console.log('✅ Purged excess rows. 1 Truth Row remains.');
        } else {
            console.log('✅ Single state row already exists. Ready.');
        }

    } catch (error) {
        console.error('❌ Error setting up live state:', error);
    } finally {
        await pool.end();
        process.exit(0);
    }
}

setupLiveState();
