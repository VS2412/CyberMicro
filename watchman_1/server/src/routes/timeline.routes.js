import { Router } from 'express';
import { addTimelineAction, verifyAuditChain } from '../controllers/timeline.controller.js';
import { handle } from '../utils/httpError.js';

const router = Router();

router.post('/:id/timeline', handle(addTimelineAction));
router.get('/:id/verify-chain', handle(verifyAuditChain));

export default router;
