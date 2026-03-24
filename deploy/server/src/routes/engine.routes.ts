import { Router } from 'express';
import {
  getAllEngines, getEngineByTag, createEngine, updateEngine, deleteEngine,
  getSkidConfigurations, createSkidConfiguration, addDriveTrain, removeDriveTrain,
  getDriverDrivenForFL
} from '../controllers/engine.controller';

const router = Router();

// Engine Registry
router.get('/', getAllEngines);
router.get('/:tagId', getEngineByTag);
router.post('/', createEngine);
router.put('/:id', updateEngine);
router.delete('/:id', deleteEngine);

// Skid Configuration (Multi-Driver Support)
router.get('/skids/config', getSkidConfigurations);
router.post('/skids/config', createSkidConfiguration);
router.post('/skids/config/:skidConfigId/drive-train', addDriveTrain);
router.delete('/skids/drive-train/:id', removeDriveTrain);
router.get('/skids/fl/:flId/driver-driven', getDriverDrivenForFL);

export default router;
