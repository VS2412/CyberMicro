import { Router } from 'express';
import { assertFact, dismissSuggestion, markSubmitted, waiveObligation } from '../controllers/obligation.controller.js';
import { handle } from '../utils/httpError.js';

const router = Router();

router.post('/:id/facts', handle(assertFact));
router.post('/:id/suggested-facts/:key/dismiss', handle(dismissSuggestion));
router.post('/:id/obligations/:stageId/submit', handle(markSubmitted));
router.post('/:id/obligations/:stageId/waive', handle(waiveObligation));

export default router;
