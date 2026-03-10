
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';
import { Client, Users, Query } from 'node-appwrite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from project root
dotenv.config({ path: join(__dirname, '../.env') });

// Initialize the Appwrite client
const client = new Client()
    .setEndpoint('https://sgp.cloud.appwrite.io/v1')
    .setProject('69984f20001fae960e0b')
    .setKey('standard_c255e7e4893d27bec12222958156beadb3648ba518362db461da7314246b0c2c134cf2f1af152007af2de114ec2c3648f83d31d8ed8ad336ceb84185bf08708093a6db9b7f2bea07fa0c2f10b30ed31ab99c384a7486d6c58a934ea401fe66f2becf166773033b5998ac380116717db4c4ab2669e6a49f7b5ce2a8a7299bdba8'); // Needs an API key with users.read and users.write scope

const users = new Users(client);

const LABEL_TO_REMOVE = 'round2';

async function removeLabelFromUsers() {
    try {
        console.log(`Searching for users with label: ${LABEL_TO_REMOVE}...`);

        // List users (Appwrite doesn't always support filtering by label directly in listUsers in older versions, 
        // but we can try Query.equal or list and filter client side if the set is small.
        // For large sets, we might need to iterate.
        // Let's assume we can fetch and filter.)

        // Note: 'labels' might not be a direct queryable attribute in all setups without cloud config.
        // We will fetch batches and filter in code to be safe.

        let hasMore = true;
        let lastId = null;
        let processedCount = 0;

        while (hasMore) {
            const queries = [Query.limit(100)];
            if (lastId) queries.push(Query.cursorAfter(lastId));

            const response = await users.list(queries);

            if (response.users.length === 0) {
                hasMore = false;
                break;
            }

            for (const user of response.users) {
                lastId = user.$id;

                if (user.labels && user.labels.includes(LABEL_TO_REMOVE)) {
                    const newLabels = user.labels.filter(l => l !== LABEL_TO_REMOVE);

                    try {
                        await users.updateLabels(user.$id, newLabels);
                        console.log(`Removed '${LABEL_TO_REMOVE}' from user: ${user.name} (${user.$id})`);
                        processedCount++;
                    } catch (updateErr) {
                        console.error(`Failed to update user ${user.$id}:`, updateErr.message);
                    }
                }
            }
        }

        console.log(`Operation complete. Removed label from ${processedCount} users.`);

    } catch (error) {
        console.error('Error listing users:', error);
    }
}

removeLabelFromUsers();
