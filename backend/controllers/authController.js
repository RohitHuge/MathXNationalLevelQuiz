import { ID } from 'node-appwrite';
import pool from '../config/db.js';
import { appwriteUsers } from '../config/appwrite.js';

export const registerUser = async (req, res) => {
    const { fullName, email, collegeName, password } = req.body;

    if (!fullName || !email || !password) {
        return res.status(400).json({ error: 'Full name, email, and password are required.' });
    }

    try {
        // 1. Create User in Appwrite Auth
        console.log(`[Register] Creating Appwrite Identity for: ${email}`);
        let newAppwriteUser;
        try {
            newAppwriteUser = await appwriteUsers.create(
                ID.unique(),
                email,
                undefined, // phone
                password,
                fullName
            );
        } catch (appwriteErr) {
            console.error('[Register] Appwrite Auth Creation Failed:', appwriteErr.message);
            // Appwrite uses status codes, 409 usually means user already exists
            if (appwriteErr.code === 409) {
                return res.status(409).json({ error: 'This email is already registered in Auth.' });
            }
            return res.status(500).json({ error: 'Failed to create User Auth profile.' });
        }

        // 2. Insert User into PostgreSQL to satisfy Relational Constraints
        console.log(`[Register] Creating PostgreSQL Definition for: ${email} with Native Appwrite ID: ${newAppwriteUser.$id}`);
        const query = `
            INSERT INTO public.users (id, full_name, email, college_name) 
            VALUES ($1, $2, $3, $4) 
            RETURNING id, full_name, email;
        `;
        const result = await pool.query(query, [newAppwriteUser.$id, fullName, email, collegeName || null]);

        // Respond with the newly created Postgres user definition combined with Appwrite info
        res.status(201).json({
            sqlUser: result.rows[0],
            appwriteUserId: newAppwriteUser.$id
        });
    } catch (error) {
        console.error('Registration API Error:', error);

        if (error.code === '23505') { // Postgres unique_violation code
            return res.status(409).json({ error: 'This email was registered recently in the database.' });
        }
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const getUserProfile = async (req, res) => {
    const { id } = req.params;

    if (!id) {
        return res.status(400).json({ error: 'User ID is required.' });
    }

    try {
        const query = `
            SELECT u.id, u.full_name, u.email, u.college_name, t.team_name, u.is_leader
            FROM public.users u
            LEFT JOIN public.team t ON u.team_id = t.id
            WHERE u.id = $1
            LIMIT 1;
        `;
        const result = await pool.query(query, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found.' });
        }

        res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error('Get User Profile API Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
