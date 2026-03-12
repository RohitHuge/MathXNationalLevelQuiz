import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: "../.env" });

const { Pool } = pkg;


const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function testConnection() {
    try {
        const question = await pool.query('SELECT * FROM questions');
        console.log('✅ Database connection successful!');
        console.log(question.rows);
    } catch (error) {
        console.error('❌ Error connecting to the database:', error);
    } finally {
        await pool.end();
    }
}

testConnection();