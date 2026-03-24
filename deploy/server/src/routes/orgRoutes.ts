import express from 'express';
import { 
    getHierarchy, 
    updateCompany, 
    createDepartment, 
    updateDepartment, 
    deleteDepartment
} from '../controllers/orgController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = express.Router();

router.use(authenticateToken); // Protect all org routes

router.get('/hierarchy', getHierarchy);
router.put('/companies/:id', updateCompany);

router.post('/departments', createDepartment);
router.put('/departments/:id', updateDepartment);
router.delete('/departments/:id', deleteDepartment);

export default router;
