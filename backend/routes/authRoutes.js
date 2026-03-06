import express from 'express';
import { registerUser } from '../controllers/authController.js';

const router = express.Router();

// REST API endpoint: Testing Registration Form
router.post('/register', registerUser);

export default router;
