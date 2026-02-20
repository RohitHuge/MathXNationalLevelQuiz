import { Client, Account, Databases } from 'appwrite';

const client = new Client()
    .setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
    .setProject(import.meta.env.VITE_APPWRITE_PROJECT_ID || '');

export const account = new Account(client);
export const databases = new Databases(client);

export const appwriteConfig = {
    databaseId: import.meta.env.VITE_APPWRITE_DATABASE_ID || '',
    quizzesCollectionId: import.meta.env.VITE_APPWRITE_QUIZZES_COLLECTION_ID || '',
    questionsCollectionId: import.meta.env.VITE_APPWRITE_QUESTIONS_COLLECTION_ID || '',
    attemptsCollectionId: import.meta.env.VITE_APPWRITE_ATTEMPTS_COLLECTION_ID || ''
};

export default client;
