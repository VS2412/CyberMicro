import { Router } from 'express';
import { createIncident, getIncidentById, listIncidents } from '../controllers/incident.controller.js';
import { handle } from '../utils/httpError.js';

const router = Router();

router.get('/', handle(listIncidents));
router.post('/', handle(createIncident));
router.get('/:id', handle(getIncidentById));

export default router;
