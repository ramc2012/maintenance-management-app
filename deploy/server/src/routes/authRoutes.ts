import express from 'express';
import { login, register, getUsers, deleteUser, resetPassword, changePassword, updateUserPermissions } from '../controllers/authController';
import { authenticateToken, authorizeRole } from '../middleware/auth';

const router = express.Router();

router.post('/login', login);
router.post('/register', authenticateToken, authorizeRole(['ADMIN']), register);
router.get('/users', authenticateToken, authorizeRole(['ADMIN']), getUsers);
router.delete('/users/:id', authenticateToken, authorizeRole(['ADMIN']), deleteUser);
router.post('/users/:id/reset-password', authenticateToken, authorizeRole(['ADMIN']), resetPassword);
router.patch('/users/:id/permissions', authenticateToken, authorizeRole(['ADMIN']), updateUserPermissions);
router.post('/change-password', authenticateToken, changePassword);

export default router;
