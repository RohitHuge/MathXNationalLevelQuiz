import { Client, Users } from 'node-appwrite';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Appwrite Admin SDK
const appwriteClient = new Client()
    .setEndpoint('https://sgp.cloud.appwrite.io/v1') // Default endpoint, change if needed
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

const appwriteUsers = new Users(appwriteClient);

export { appwriteClient, appwriteUsers };
