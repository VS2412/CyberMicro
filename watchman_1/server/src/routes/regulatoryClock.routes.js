import { Router } from 'express';
import { triggerRegulatoryClock, getClockStatus, simulateClockOffset } from '../controllers/regulatoryClock.controller.js';

const router = Router();

router.post('/:id/trigger-clock', triggerRegulatoryClock);
router.get('/:id/clock-status', getClockStatus);
router.post('/:id/simulate-clock', simulateClockOffset);

export default router;