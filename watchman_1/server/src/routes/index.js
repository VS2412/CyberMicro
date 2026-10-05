import { Router } from 'express';
import incidentRoutes from './incident.routes.js';
import timelineRoutes from './timeline.routes.js';
import playbookRoutes from './playbook.routes.js';
import regulatoryClockRoutes from './regulatoryClock.routes.js';

const apiRouter = Router();

apiRouter.use('/incidents', incidentRoutes);
apiRouter.use('/incidents', timelineRoutes);
apiRouter.use('/incidents', playbookRoutes);
apiRouter.use('/incidents', regulatoryClockRoutes);

export default apiRouter;