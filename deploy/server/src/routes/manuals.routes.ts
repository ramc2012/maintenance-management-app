import express from 'express';
import multer from 'multer';
import path from 'path';
import { promises as fsPromises } from 'fs';
import {
  createFolder,
  deleteDocument,
  deleteFolder,
  getRepository,
  streamDocumentContent,
  updateFolder,
  uploadDocuments,
} from '../controllers/manualsController';
import { authenticateToken, authorizeRole } from '../middleware/auth';

const router = express.Router();
const tempUploadDir = path.resolve(__dirname, '../../storage/manuals/.tmp');
const editorRoles = ['ADMIN', 'USER', 'PROCUREMENT_OFFICER', 'L1', 'L2', 'L3', 'L4'];

const upload = multer({
  storage: multer.diskStorage({
    destination: async (_req, _file, cb) => {
      try {
        await fsPromises.mkdir(tempUploadDir, { recursive: true });
        cb(null, tempUploadDir);
      } catch (error: any) {
        cb(error, tempUploadDir);
      }
    },
    filename: (_req, file, cb) => {
      cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, '-')}`);
    },
  }),
  limits: {
    fileSize: 25 * 1024 * 1024,
  },
});

router.use(authenticateToken);

router.get('/repository', getRepository);
router.post('/folders', authorizeRole(editorRoles), createFolder);
router.put('/folders/:id', authorizeRole(editorRoles), updateFolder);
router.delete('/folders/:id', authorizeRole(editorRoles), deleteFolder);
router.post('/folders/:id/documents', authorizeRole(editorRoles), upload.array('files', 10), uploadDocuments);
router.get('/documents/:id/content', streamDocumentContent);
router.delete('/documents/:id', authorizeRole(editorRoles), deleteDocument);

export default router;
