import { Router } from 'express';
import { analyze, decideStep, tagTechnique, reviewTechnique } from '../controllers/playbook.controller.js';
import { handle } from '../utils/httpError.js';

const router = Router();

router.post('/:id/analyze', handle(analyze));
router.post('/:id/steps/:stepRef/decision', handle(decideStep));
router.post('/:id/techniques', handle(tagTechnique));
router.post('/:id/techniques/:inputId/review', handle(reviewTechnique));

export default router;
