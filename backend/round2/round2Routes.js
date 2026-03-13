import express from 'express';
import { getRound2Reports, qualifyTopNTeams, revokeAllQualifications } from './round2Controller.js';

const router = express.Router();

router.post('/qualify', qualifyTopNTeams);
router.post('/revoke', revokeAllQualifications);
router.get('/reports', getRound2Reports);

export default router;
