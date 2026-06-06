import express from 'express';
import { login, register, getUsers, deleteUser, resetPassword, changePassword, updateUserPermissions } from '../controllers/authController';
import { authenticateToken, authorizeRole } from '../middleware/auth';

const router = express.Router();

router.post('/login', login);
router.post('/register', authenticateToken, authorizeRole(['ADMIN', 'HOD']), register);
router.get('/users', authenticateToken, authorizeRole(['ADMIN', 'HOD']), getUsers);
router.delete('/users/:id', authenticateToken, authorizeRole(['ADMIN', 'HOD']), deleteUser);
router.post('/users/:id/reset-password', authenticateToken, authorizeRole(['ADMIN', 'HOD']), resetPassword);
router.patch('/users/:id/permissions', authenticateToken, authorizeRole(['ADMIN', 'HOD']), updateUserPermissions);
router.post('/change-password', authenticateToken, changePassword);

export default router;
