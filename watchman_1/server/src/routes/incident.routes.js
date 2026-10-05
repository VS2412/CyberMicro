import { Router } from 'express';
import { createIncident, getIncidentById } from '../controllers/incident.controller.js';

const router = Router();

router.post('/', createIncident);
router.get('/:id', getIncidentById);

export default router;