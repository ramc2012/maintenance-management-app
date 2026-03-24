import { Router } from 'express';
import {
  getAssets, getAssetById, createAsset, updateAsset, deleteAsset,
  installAsset, removeAsset, getAssetHistory, getSpecTemplates
} from '../controllers/asset.controller';

const router = Router();

// Assets CRUD
router.get('/', getAssets);
router.get('/templates', getSpecTemplates);
router.get('/:id', getAssetById);
router.post('/', createAsset);
router.put('/:id', updateAsset);
router.delete('/:id', deleteAsset);

// Install/Remove transactions
router.post('/:id/install', installAsset);
router.post('/:id/remove', removeAsset);
router.get('/:id/history', getAssetHistory);

export default router;
