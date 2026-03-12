import { Client, Users, Query } from 'node-appwrite';
import dotenv from 'dotenv';
dotenv.config({ path: "../.env" });

const client = new Client()
    .setEndpoint('https://sgp.cloud.appwrite.io/v1')
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

const users = new Users(client);

async function test() {
    try {
        console.log("Testing with empty array:");
        const res1 = await users.list([]);
        console.log("Res1 total:", res1.total, "users count:", res1.users.length);

        console.log("Testing with Query.limit and Query.offset:");
        const res2 = await users.list([
            Query.limit(100),
            Query.offset(0)
        ]);
        console.log("Res2 total:", res2.total, "users count:", res2.users.length);
    } catch (e) {
        console.error("Error:", e);
    }
}

test();
