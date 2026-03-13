import { Client, Users, ID } from 'node-appwrite';
import pkg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config({ path: "../.env" });

const { Pool } = pkg;

// Appwrite Configuration
const APPWRITE_ENDPOINT = 'https://sgp.cloud.appwrite.io/v1'; // Default, change if custom
const APPWRITE_PROJECT_ID = process.env.APPWRITE_PROJECT_ID;
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY;

// PostgreSQL Configurations
const SUPABASE_DB_URL = process.env.SUPABASE_DB_URL;
const DATABASE_URL = process.env.DATABASE_URL;

if (!APPWRITE_PROJECT_ID || !APPWRITE_API_KEY || !DATABASE_URL || !SUPABASE_DB_URL) {
    console.error('❌ Missing environment variables. Please check your .env file.');
    console.error('Required: APPWRITE_PROJECT_ID, APPWRITE_API_KEY, DATABASE_URL, SUPABASE_DB_URL');
    process.exit(1);
}

// Initialize Appwrite Admin SDK
const client = new Client()
    .setEndpoint(APPWRITE_ENDPOINT)
    .setProject(APPWRITE_PROJECT_ID)
    .setKey(APPWRITE_API_KEY);

const appwriteUsers = new Users(client);

// Initialize PostgreSQL Pools
const supabasePool = new Pool({
    connectionString: SUPABASE_DB_URL,
    ssl: { rejectUnauthorized: false } // Required for Supabase connections usually
});

const vpsPool = new Pool({
    connectionString: DATABASE_URL,
});

async function migrateData() {
    console.log('🔄 Starting full migration from Supabase to VPS & Appwrite...');
    console.log('===============================================================');

    try {
        // --- STEP 1: MIGRATE TEAMS ---
        console.log('\n[1/3] Fetching Teams from Supabase...');
        const teamsQuery = await supabasePool.query('SELECT * FROM public.teams');
        const teams = teamsQuery.rows;
        console.log(`✅ Found ${teams.length} teams.`);

        console.log('\n[2/3] Migrating Teams to VPS DB...');
        let teamsMigrated = 0;
        let teamsSkipped = 0;

        for (const team of teams) {
            try {
                // Insert into VPS preserving the original ID
                const insertTeamQuery = `
                    INSERT INTO public.team (id, team_name, status, total_score, rank, created_at, ref_id)
                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                    ON CONFLICT (id) DO NOTHING
                    RETURNING id;
                `;
                const values = [
                    team.id,
                    team.team_name,
                    team.status,
                    team.total_score,
                    team.rank,
                    team.created_at,
                    team.ref_id
                ];

                const res = await vpsPool.query(insertTeamQuery, values);
                if (res.rowCount > 0) {
                    teamsMigrated++;
                } else {
                    teamsSkipped++;
                }
            } catch (err) {
                console.error(`❌ Failed to migrate team ${team.id}:`, err.message);
            }
        }
        console.log(`📊 Teams Migrated: ${teamsMigrated} | Skipped (Conflict): ${teamsSkipped}`);

        // --- STEP 2: MIGRATE USERS ---
        console.log('\n[3/3] Fetching Users from Supabase and migrating...');
        const usersQuery = await supabasePool.query('SELECT * FROM public.members');
        const users = usersQuery.rows;
        console.log(`✅ Found ${users.length} users in Supabase.`);

        let appwriteCreated = 0;
        let appwriteSkipped = 0;
        let dbUsersMigrated = 0;
        let dbUsersSkipped = 0;

        for (const user of users) {
            console.log(`\n⏳ Processing user: ${user.email} (ID: ${user.id})`);

            // 1. Create Appwrite Account
            let appwriteUserId = user.id; // Try to keep the same UUID

            try {
                // Check if user already exists in Appwrite to avoid errors
                try {
                    await appwriteUsers.get(appwriteUserId);
                    console.log(`   ⏭️ Appwrite Account exists. Skipped creation.`);
                    appwriteSkipped++;
                } catch (e) {
                    // If user doesn't exist, create it.
                    if (e.code === 404) {
                        await appwriteUsers.create(
                            appwriteUserId,            // userId
                            user.email,            // email
                            user.phone || undefined, // phone (Appwrite requires strong format, could be error prone if invalid)
                            '1729',            // password
                            user.full_name         // name
                        );
                        console.log(`   ✅ Appwrite Account created.`);
                        appwriteCreated++;
                    } else {
                        throw e; // rethrow other errors
                    }
                }
            } catch (awError) {
                // Appwrite phone format is strict. If it fails, try without phone.
                if (awError.message.includes('Phone') && awError.code === 400) {
                    console.log(`   ⚠️ Phone number format invalid for Appwrite. Retrying without phone...`);
                    try {
                        await appwriteUsers.create(
                            appwriteUserId,
                            user.email,
                            undefined, // no phone
                            '12345678',
                            user.full_name
                        );
                        console.log(`   ✅ Appwrite Account created (without phone).`);
                        appwriteCreated++;
                    } catch (retryErr) {
                        console.error(`   ❌ Appwrite Fallback Error for ${user.email}:`, retryErr.message);
                    }
                } else {
                    console.error(`   ❌ Appwrite Error for ${user.email}:`, awError.message);
                }
            }

            // 2. Insert into VPS Database (After Appwrite creation to ensure UUIDs match)
            try {
                const insertUserQuery = `
                    INSERT INTO public.users (id, team_id, full_name, email, phone, college_name, is_leader, username, password_hash, individual_score, created_at)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                    ON CONFLICT (id) DO NOTHING
                    RETURNING id;
                `;
                const values = [
                    user.id,
                    user.team_id,
                    user.full_name,
                    user.email,
                    user.phone,
                    user.college_name,
                    user.is_leader,
                    user.username,
                    user.password_hash,
                    user.individual_score,
                    user.created_at
                ];

                const res = await vpsPool.query(insertUserQuery, values);
                if (res.rowCount > 0) {
                    console.log(`   ✅ Inserted into VPS Database.`);
                    dbUsersMigrated++;
                } else {
                    console.log(`   ⏭️ Exists in VPS Database. Skipped.`);
                    dbUsersSkipped++;
                }

            } catch (dbErr) {
                console.error(`   ❌ VPS DB Error for ${user.email}:`, dbErr.message);
            }
        }

        console.log('\n===============================================================');
        console.log(`🎉 Migration Process Complete!`);
        console.log(`📊 Summary:`);
        console.log(`   - Teams Migrated to DB:     ${teamsMigrated} / ${teams.length}`);
        console.log(`   - Users Created in Appwrite: ${appwriteCreated} / ${users.length}`);
        console.log(`   - Users Migrated to DB:      ${dbUsersMigrated} / ${users.length}`);
        console.log('===============================================================');

    } catch (error) {
        console.error('❌ Critical Error during migration:', error);
    } finally {
        await supabasePool.end();
        await vpsPool.end();
        process.exit(0);
    }
}

migrateData();
