import { Router } from 'express';
import { generatePlaybook } from '../controllers/playbook.controller.js';

const router = Router();

router.post('/:id/generate-playbook', generatePlaybook);

export default router;