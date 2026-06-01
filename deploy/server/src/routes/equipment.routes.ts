import { Router } from 'express';
import {
  getInstrumentHistory,
  getInstallations,
  createInstallation,
  updateInstallation,
  getInstruments,
  createInstrument,
  updateInstrument,
  getStandards,
  createStandard,
  updateStandard,
  getLogs,
  createLog,
  getReplacements,
  getInstrumentTypes,
  createInstrumentType,
  updateInstrumentType,
  getCustodyMeters,
  createCustodyMeter,
  updateCustodyMeter,
  getPMSchedules,
  createPMSchedule,
  deletePMSchedule,
  getInternalMeters,
  createInternalMeter,
  updateInternalMeter,
  addInstrumentToMeter,
  getRunningEquipment,
  createRunningEquipment,
  updateRunningEquipment,
  getEquipmentTypes,
  createEquipmentType,
  updateEquipmentType,
  getMeterTypes,
  createMeterType,
  updateMeterType,
  deleteMeterType,
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getPerformers,
  createPerformer,
  updatePerformer,
  getEquipmentByCategory,
  createCategoryEquipment,
  updateCategoryEquipment,
  deleteCategoryEquipment,
  getEquipmentQR,
  getInstrumentQR,
} from '../controllers/equipment.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

// Installations
router.get('/installations', getInstallations);
router.post('/installations', createInstallation);
router.put("/installations/:id", updateInstallation);

// Instrument Types & PM
router.get('/types', getInstrumentTypes);
router.post('/types', createInstrumentType);
router.put("/types/:id", updateInstrumentType);
router.get('/pm-schedules', getPMSchedules);
router.post('/pm-schedules', createPMSchedule);
router.delete('/pm-schedules/:id', deletePMSchedule);

// Equipment Types
router.get('/equipment-types', getEquipmentTypes);
router.post('/equipment-types', createEquipmentType);
router.put('/equipment-types/:id', updateEquipmentType);

// Meter Types
router.get('/meter-types', getMeterTypes);
router.post('/meter-types', createMeterType);
router.put('/meter-types/:id', updateMeterType);
router.delete('/meter-types/:id', deleteMeterType);

// Products
router.get('/products', getProducts);
router.post('/products', createProduct);
router.put('/products/:id', updateProduct);
router.delete('/products/:id', deleteProduct);

// Calibration Performers
router.get('/performers', getPerformers);
router.post('/performers', createPerformer);
router.put('/performers/:id', updatePerformer);

// Instruments
router.get('/instruments', getInstruments);
router.post('/instruments', createInstrument);
router.put("/instruments/:tagId", updateInstrument);

// Custody Meters
router.get('/custody', getCustodyMeters);
router.post('/custody', createCustodyMeter);
router.put("/custody/:id", updateCustodyMeter);

// Internal Meters
router.get('/internal-meters', getInternalMeters);
router.post('/internal-meters', createInternalMeter);
router.put("/internal-meters/:id", updateInternalMeter);

// Static & Running Equipment
router.get('/running-equip', getRunningEquipment);
router.post('/running-equip', createRunningEquipment);
router.put('/running-equip/:id', updateRunningEquipment);

// Meter Composition
router.post('/meter-link', addInstrumentToMeter);

// Standards
router.get('/standards', getStandards);
router.post('/standards', createStandard);
router.put("/standards/:tagId", updateStandard);

// Logs & History
router.get('/logs/:tagId', getLogs);
router.post('/logs', createLog);
router.get('/replacements/:tagId', getReplacements);
router.get('/instruments/:tagId/history', getInstrumentHistory);

// Category-based equipment routes
router.get('/category/:category', getEquipmentByCategory);
router.post('/category', createCategoryEquipment);
router.put('/category/:id', updateCategoryEquipment);
router.delete('/category/:id', deleteCategoryEquipment);

// QR Codes
router.get('/qr/:tag', getEquipmentQR);
router.get('/instruments/:tagId/qr', getInstrumentQR);

export default router;
