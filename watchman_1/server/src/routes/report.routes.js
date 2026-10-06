import { Router } from 'express';
import { setField, draft, finalize } from '../controllers/report.controller.js';
import { handle } from '../utils/httpError.js';

const router = Router();

router.post('/:id/report/fields', handle(setField));
router.post('/:id/report/draft', handle(draft));
router.post('/:id/report/finalize', handle(finalize));

export default router;
