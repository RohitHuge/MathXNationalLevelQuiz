import { Client, Users, Query } from 'node-appwrite';
import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: "../.env" });

const { Pool } = pkg;

// Appwrite Configuration
const APPWRITE_ENDPOINT = 'https://sgp.cloud.appwrite.io/v1'; // Default, change if custom
const APPWRITE_PROJECT_ID = process.env.APPWRITE_PROJECT_ID;
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY;

// PostgreSQL Configuration
const DATABASE_URL = process.env.DATABASE_URL;

if (!APPWRITE_PROJECT_ID || !APPWRITE_API_KEY || !DATABASE_URL) {
    console.error('❌ Missing environment variables. Please check your .env file.');
    process.exit(1);
}

// Initialize Appwrite Admin SDK
const client = new Client()
    .setEndpoint(APPWRITE_ENDPOINT)
    .setProject(APPWRITE_PROJECT_ID)
    .setKey(APPWRITE_API_KEY);

const users = new Users(client);

// Initialize PostgreSQL Pool
const pool = new Pool({
    connectionString: DATABASE_URL,
});

async function syncUsers() {
    console.log('🔄 Starting Appwrite to PostgreSQL User Synchronization...');

    try {
        let totalSynced = 0;
        let offset = 0;
        let limit = 100; // Batch limit
        let hasMore = true;

        while (hasMore) {
            console.log(`📡 Fetching users from Appwrite (Offset: ${offset})...`);

            // Note: node-appwrite uses queries
            const response = await users.list([
                Query.limit(limit),
                Query.offset(offset)
            ]);
            const userList = response.users;

            if (userList.length === 0) {
                hasMore = false;
                break;
            }

            console.log(`✅ Found ${userList.length} users in this batch. Syncing to Postgres...`);

            for (const user of userList) {
                const { name, email } = user;

                // We use Postgres ON CONFLICT DO NOTHING to avoid duplicate errors
                const query = `
                    INSERT INTO public.users (id, full_name, email)
                    VALUES ($1, $2, $3)
                    ON CONFLICT (id) DO NOTHING
                    RETURNING id;
                `;

                // Using a transaction/pool query
                const dbRes = await pool.query(query, [user.$id, name || 'Unknown User', email]);

                if (dbRes.rowCount > 0) {
                    console.log(`   ➕ Inserted new user: ${email} (ID: ${dbRes.rows[0].id})`);
                    totalSynced++;
                } else {
                    // rowCount is 0 if conflict was hit
                    // console.log(`   ⏭️ Skipped existing user: ${email}`);
                }
            }

            offset += limit;
        }

        console.log(`\n🎉 Synchronization Complete!`);
        console.log(`📊 Total new users synced from Appwrite to Postgres: ${totalSynced}`);

    } catch (error) {
        console.error('❌ Error during synchronization:', error);
    } finally {
        await pool.end();
        process.exit(0);
    }
}

syncUsers();
