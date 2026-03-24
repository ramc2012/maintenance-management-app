import { Router } from 'express';
import {
  getStaticEquipment, getStaticEquipmentById, createStaticEquipment,
  updateStaticEquipment, deleteStaticEquipment, getStaticEquipmentDashboard
} from '../controllers/staticEquipment.controller';

const router = Router();

router.get('/dashboard', getStaticEquipmentDashboard);
router.get('/', getStaticEquipment);
router.get('/:id', getStaticEquipmentById);
router.post('/', createStaticEquipment);
router.put('/:id', updateStaticEquipment);
router.delete('/:id', deleteStaticEquipment);

export default router;
