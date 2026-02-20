import dotenv from 'dotenv';
import { Client, Databases, Permission, Role } from 'node-appwrite';

dotenv.config();

// Initialize Appwrite Server Client
const client = new Client()
    .setEndpoint(process.env.VITE_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
    .setProject(process.env.VITE_APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY); // Requires an API key with full Db access

const databases = new Databases(client);

const setupDatabase = async () => {
    try {
        console.log('Starting MathX Appwrite Database Setup...');

        // 1. Create Database
        const dbId = 'mathx';
        try {
            await databases.create(dbId, 'MathX CBT Database');
            console.log(`✅ Database created: ${dbId}`);
        } catch (e) {
            if (e.code === 409) console.log(`ℹ️ Database ${dbId} already exists.`);
            else throw e;
        }

        // 2. Create Quizzes Collection
        const quizzesCmd = 'quizzes';
        try {
            await databases.createCollection(dbId, quizzesCmd, 'Quizzes', [
                Permission.read(Role.users()), // Authenticated users can read
            ]);
            console.log(`✅ Collection created: ${quizzesCmd}`);

            await databases.createStringAttribute(dbId, quizzesCmd, 'title', 255, true);
            await databases.createStringAttribute(dbId, quizzesCmd, 'description', 1000, false);
            await databases.createIntegerAttribute(dbId, quizzesCmd, 'duration', true);
            await databases.createBooleanAttribute(dbId, quizzesCmd, 'isActive', true);
            console.log(`✅ Attributes added to ${quizzesCmd}`);
        } catch (e) {
            if (e.code === 409) console.log(`ℹ️ Collection ${quizzesCmd} already exists.`);
            else throw e;
        }

        // 3. Create Questions Collection
        const questionsCmd = 'questions';
        try {
            await databases.createCollection(dbId, questionsCmd, 'Questions', [
                Permission.read(Role.users()),
            ]);
            console.log(`✅ Collection created: ${questionsCmd}`);

            await databases.createStringAttribute(dbId, questionsCmd, 'quizId', 50, true);
            await databases.createStringAttribute(dbId, questionsCmd, 'questionText', 2000, true);
            await databases.createStringAttribute(dbId, questionsCmd, 'options', 5000, true, null, true); // array of strings
            await databases.createIntegerAttribute(dbId, questionsCmd, 'correctOptionIndex', true);
            await databases.createIntegerAttribute(dbId, questionsCmd, 'points', true);
            console.log(`✅ Attributes added to ${questionsCmd}`);
        } catch (e) {
            if (e.code === 409) console.log(`ℹ️ Collection ${questionsCmd} already exists.`);
            else throw e;
        }

        // 4. Create Attempts Collection
        const attemptsCmd = 'attempts';
        try {
            // Users can create attempts and read their own
            await databases.createCollection(dbId, attemptsCmd, 'Attempts', [
                Permission.create(Role.users()),
            ]);
            console.log(`✅ Collection created: ${attemptsCmd}`);

            await databases.createStringAttribute(dbId, attemptsCmd, 'userId', 50, true);
            await databases.createStringAttribute(dbId, attemptsCmd, 'quizId', 50, true);
            await databases.createIntegerAttribute(dbId, attemptsCmd, 'score', true);
            await databases.createStringAttribute(dbId, attemptsCmd, 'answers', 10000, true); // JSON stored answers
            await databases.createDatetimeAttribute(dbId, attemptsCmd, 'submittedAt', true);
            console.log(`✅ Attributes added to ${attemptsCmd}`);
        } catch (e) {
            if (e.code === 409) console.log(`ℹ️ Collection ${attemptsCmd} already exists.`);
            else throw e;
        }

        console.log('\n=========================================');
        console.log('🎉 Setup Complete! Next steps:');
        console.log('1. Ensure your .env has these values:');
        console.log(`VITE_APPWRITE_DATABASE_ID=${dbId}`);
        console.log(`VITE_APPWRITE_QUIZZES_COLLECTION_ID=${quizzesCmd}`);
        console.log(`VITE_APPWRITE_QUESTIONS_COLLECTION_ID=${questionsCmd}`);
        console.log(`VITE_APPWRITE_ATTEMPTS_COLLECTION_ID=${attemptsCmd}`);
        console.log('=========================================');

    } catch (error) {
        console.error('❌ Setup failed:', error);
    }
};

setupDatabase();
