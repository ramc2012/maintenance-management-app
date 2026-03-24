import { Router } from 'express';
import {
  getAssetsForFL,
  assignAssetToFL,
  updateAssignment,
  removeAssignment,
  getEquipmentTrain,
  getAvailableAssets,
  replaceAsset,
  getAuditHistory
} from '../controllers/flAsset.controller';

const router = Router();

// Get available assets for assignment
router.get('/available', getAvailableAssets);

// FL Asset assignments
router.get('/:flId', getAssetsForFL);
router.get('/:flId/train', getEquipmentTrain);
router.get('/:flId/history', getAuditHistory);

router.post('/', assignAssetToFL);
router.put('/:id', updateAssignment);
router.put('/:id/replace', replaceAsset);
router.delete('/:id', removeAssignment);

export default router;
