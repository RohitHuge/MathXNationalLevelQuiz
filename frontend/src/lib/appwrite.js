import { Client, Account } from 'appwrite';

const APPWRITE_ENDPOINT = import.meta.env.VITE_APPWRITE_ENDPOINT || 'https://sgp.cloud.appwrite.io/v1';
const APPWRITE_PROJECT_ID = import.meta.env.VITE_APPWRITE_PROJECT_ID || '69984f20001fae960e0b';

const client = new Client()
    .setEndpoint(APPWRITE_ENDPOINT)
    .setProject(APPWRITE_PROJECT_ID);

export const account = new Account(client);

/** Login with email and team password */
export async function loginWithEmail(email, password) {
    return await account.createEmailPasswordSession(email, password);
}

/** Get the currently logged-in user */
export async function getCurrentUser() {
    return await account.get();
}

/** Logout and delete the current session */
export async function logout() {
    return await account.deleteSession('current');
}

export default client;
