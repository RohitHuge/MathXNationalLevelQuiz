import { Client, Users, Query } from 'node-appwrite';
import dotenv from 'dotenv';

dotenv.config({ path: "../.env" });

// Appwrite Configuration
const APPWRITE_ENDPOINT = 'https://sgp.cloud.appwrite.io/v1'; // Default, change if custom
const APPWRITE_PROJECT_ID = process.env.APPWRITE_PROJECT_ID;
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY;

if (!APPWRITE_PROJECT_ID || !APPWRITE_API_KEY) {
    console.error('❌ Missing environment variables. Please check your .env file.');
    process.exit(1);
}

// Initialize Appwrite Admin SDK
const client = new Client()
    .setEndpoint(APPWRITE_ENDPOINT)
    .setProject(APPWRITE_PROJECT_ID)
    .setKey(APPWRITE_API_KEY);

const users = new Users(client);

async function deleteNonAdminUsers() {
    console.log('🔄 Starting Appwrite non-admin users deletion...');

    try {
        let totalDeleted = 0;
        let offset = 0;
        let limit = 100; // Batch limit
        let hasMore = true;

        while (hasMore) {
            console.log(`📡 Fetching users from Appwrite (Offset: ${offset})...`);

            const response = await users.list([
                Query.limit(limit),
                Query.offset(offset)
            ]);
            const userList = response.users;

            if (userList.length === 0) {
                hasMore = false;
                break;
            }

            console.log(`✅ Found ${userList.length} users in this batch. Checking for admins...`);

            for (const user of userList) {
                const { $id, email, labels } = user;

                // Check if the user has the 'admin' label
                if (!labels || !labels.includes('admin')) {
                    console.log(`   🗑️ Deleting user: ${email || $id} (ID: ${$id}) - No 'admin' label found`);

                    try {
                        await users.delete($id);
                        totalDeleted++;
                        console.log(`   ✅ Successfully deleted user: ${email || $id}`);
                    } catch (deleteError) {
                        console.error(`   ❌ Failed to delete user: ${email || $id}. Error: ${deleteError.message}`);
                    }
                } else {
                    console.log(`   ⏭️ Skipped admin user: ${email || $id}`);
                }
            }

            // offset += limit; // We don't increment offset because deleting users shifts the list
            // If we deleted users, the next batch of users will shift down to the current offset.
            // However, to be safe and avoid infinite loops if some deletions fail, we can fetch
            // from the beginning again since we are removing non-admin users.
            // Actually, querying with offset might be tricky if list changes mid-iteration.
            // Since we are changing the dataset, it's safer to not increment offset and always fetch the first page,
            // OR increment offset ONLY by the number of skipped users.

            // Let's recalculate offset based on skipped users.
            let skippedInThisBatch = 0;
            for (const user of userList) {
                if (user.labels && user.labels.includes('admin')) {
                    skippedInThisBatch++;
                }
            }
            offset += skippedInThisBatch;

            // If we didn't delete anything, we must increment offset by limit to avoid infinite loop
            if (skippedInThisBatch === userList.length) {
                // All users were skipped, move to next page
                offset = offset - skippedInThisBatch + limit;
            }
        }

        console.log(`\n🎉 Deletion Complete!`);
        console.log(`📊 Total non-admin users deleted from Appwrite: ${totalDeleted}`);

    } catch (error) {
        console.error('❌ Error during deletion process:', error);
    } finally {
        process.exit(0);
    }
}

deleteNonAdminUsers();
