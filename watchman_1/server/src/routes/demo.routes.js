import { Router } from 'express';
import { requireDemo, tamperWithTimeline, getDemoClock, setDemoClock } from '../controllers/demo.controller.js';
import { handle } from '../utils/httpError.js';

const router = Router();

router.use(requireDemo);
router.post('/tamper/:id', handle(tamperWithTimeline));
router.get('/clock', getDemoClock);
router.post('/clock', handle(setDemoClock));

export default router;
