import { Router } from 'express';
import { registerEvidence, transferEvidence, verifyEvidence } from '../controllers/evidence.controller.js';
import { handle } from '../utils/httpError.js';

const router = Router();

router.post('/:id/evidence', handle(registerEvidence));
router.post('/:id/evidence/:eid/transfer', handle(transferEvidence));
router.post('/:id/evidence/:eid/verify', handle(verifyEvidence));

export default router;
