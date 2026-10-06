import { Router } from 'express';
import mongoose from 'mongoose';
import incidentRoutes from './incident.routes.js';
import timelineRoutes from './timeline.routes.js';
import playbookRoutes from './playbook.routes.js';
import { listPlaybooks } from '../controllers/playbook.controller.js';
import demoRoutes from './demo.routes.js';
import obligationRoutes from './obligation.routes.js';
import reportRoutes from './report.routes.js'; // after obligations: its decorator needs them
import evidenceRoutes from './evidence.routes.js';
import { FIELD_DEFS } from '../services/reportService.js';
import { getMeta } from '../controllers/obligation.controller.js';
import { SCENARIOS } from '../services/scenarios.js';

const apiRouter = Router();

// Reject malformed incident IDs with a 400 instead of a Mongoose CastError 500
function validateId(req, res, next) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ error: 'Invalid incident ID format' });
  }
  next();
}
apiRouter.use('/incidents/:id', validateId);
apiRouter.use('/demo/:action/:id', validateId);

apiRouter.use('/incidents', incidentRoutes);
apiRouter.use('/incidents', timelineRoutes);
apiRouter.use('/incidents', obligationRoutes);
apiRouter.use('/incidents', playbookRoutes);
apiRouter.use('/incidents', reportRoutes);
apiRouter.use('/incidents', evidenceRoutes);
apiRouter.use('/demo', demoRoutes);
apiRouter.get('/meta', getMeta);
apiRouter.get('/playbooks', listPlaybooks);
apiRouter.get('/report-fields', (req, res) => res.json(FIELD_DEFS));
apiRouter.get('/scenarios', (req, res) => res.json(SCENARIOS));

export default apiRouter;
