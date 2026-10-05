import { Router } from 'express';
import { addTimelineAction, verifyAuditChain } from '../controllers/timeline.controller.js';

const router = Router();

router.post('/:id/timeline', addTimelineAction);
router.get('/:id/verify-chain', verifyAuditChain);

export default router;