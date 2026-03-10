import express from 'express';
import { registerUser, getUserProfile } from '../controllers/authController.js';

const router = express.Router();

// REST API endpoint: Testing Registration Form
router.post('/register', registerUser);

// Fetch user profile with team info
router.get('/profile/:id', getUserProfile);

export default router;
