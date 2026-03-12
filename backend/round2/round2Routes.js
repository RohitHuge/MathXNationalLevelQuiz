import express from 'express';
import { qualifyTopNTeams, revokeAllQualifications } from './round2Controller.js';

const router = express.Router();

router.post('/qualify', qualifyTopNTeams);
router.post('/revoke', revokeAllQualifications);

export default router;
