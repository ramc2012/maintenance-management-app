import { Router } from 'express';
import {
  getSites, createSite, updateSite, deleteSite,
  getAreas, createArea, updateArea, deleteArea,
  getSystems, createSystem, updateSystem, deleteSystem,
  getFunctionalLocations, getFunctionalLocationById,
  createFunctionalLocation, updateFunctionalLocation, deleteFunctionalLocation,
  getFullHierarchy, getElectricalLoad
} from '../controllers/fl.controller';

const router = Router();

// Sites
router.get('/sites', getSites);
router.post('/sites', createSite);
router.put('/sites/:id', updateSite);
router.delete('/sites/:id', deleteSite);

// Areas
router.get('/areas', getAreas);
router.post('/areas', createArea);
router.put('/areas/:id', updateArea);
router.delete('/areas/:id', deleteArea);

// Systems
router.get('/systems', getSystems);
router.post('/systems', createSystem);
router.put('/systems/:id', updateSystem);
router.delete('/systems/:id', deleteSystem);

// Functional Locations
router.get('/locations', getFunctionalLocations);
router.get('/locations/:id', getFunctionalLocationById);
router.post('/locations', createFunctionalLocation);
router.put('/locations/:id', updateFunctionalLocation);
router.delete('/locations/:id', deleteFunctionalLocation);

// Hierarchy & Calculations
router.get('/hierarchy', getFullHierarchy);
router.get('/electrical-load', getElectricalLoad);

export default router;
