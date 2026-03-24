import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const prisma = new PrismaClient();

const STORAGE_BASE = process.env.STORAGE_PATH || '/app/storage/presentations';

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = STORAGE_BASE;
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  }
});

export const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.pptx', '.ppt', '.pdf', '.key', '.odp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('Only presentation files allowed'));
  }
});

export const getPresentations = async (req: Request, res: Response) => {
  try {
    const { category, installationId } = req.query;
    const where: any = {};
    if (category) where.category = String(category);
    if (installationId) where.installationId = String(installationId);

    const presentations = await prisma.presentation.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });
    res.json(presentations);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch presentations' });
  }
};

export const uploadPresentation = async (req: Request, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const { title, category, description, author, version, tags, installationId, departmentId } = req.body;

    const presentation = await prisma.presentation.create({
      data: {
        title,
        category: category || 'OTHER',
        description,
        originalName: req.file.originalname,
        storedName: req.file.filename,
        filePath: req.file.path,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        author,
        version,
        tags: tags ? (Array.isArray(tags) ? tags : tags.split(',').map((t: string) => t.trim())) : [],
        installationId,
        departmentId,
        uploadedBy: (req as any).user?.username || 'system'
      }
    });
    res.json(presentation);
  } catch (error) {
    console.error('Upload Error:', error);
    res.status(500).json({ error: 'Failed to upload presentation' });
  }
};

export const deletePresentation = async (req: Request, res: Response) => {
  try {
    const pres = await prisma.presentation.findUnique({ where: { id: req.params.id } });
    if (!pres) return res.status(404).json({ error: 'Not found' });

    // Only uploader or ADMIN can delete
    const user = (req as any).user;
    if (user?.role !== 'ADMIN' && pres.uploadedBy !== user?.username) {
      return res.status(403).json({ error: 'Only the uploader or an admin can delete this presentation' });
    }

    if (fs.existsSync(pres.filePath)) fs.unlinkSync(pres.filePath);
    await prisma.presentation.delete({ where: { id: req.params.id } });
    res.json({ message: 'Deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete' });
  }
};

export const downloadPresentation = async (req: Request, res: Response) => {
  try {
    const pres = await prisma.presentation.findUnique({ where: { id: req.params.id } });
    if (!pres) return res.status(404).json({ error: 'Not found' });
    if (!fs.existsSync(pres.filePath)) return res.status(404).json({ error: 'File not found on disk' });
    res.download(pres.filePath, pres.originalName);
  } catch (error) {
    res.status(500).json({ error: 'Failed to download' });
  }
};

export const viewPresentation = async (req: Request, res: Response) => {
  try {
    const pres = await prisma.presentation.findUnique({ where: { id: req.params.id } });
    if (!pres) return res.status(404).json({ error: 'Not found' });
    if (!fs.existsSync(pres.filePath)) return res.status(404).json({ error: 'File not found on disk' });

    // Serve inline so the browser can render PDFs; for PPT/others, still triggers download
    const ext = path.extname(pres.originalName).toLowerCase();
    const contentTypeMap: Record<string, string> = {
      '.pdf':  'application/pdf',
      '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      '.ppt':  'application/vnd.ms-powerpoint',
      '.key':  'application/x-iwork-keynote-sffkey',
      '.odp':  'application/vnd.oasis.opendocument.presentation',
    };
    const mime = contentTypeMap[ext] || pres.mimeType || 'application/octet-stream';
    res.setHeader('Content-Type', mime);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(pres.originalName)}"`);
    res.setHeader('Content-Length', fs.statSync(pres.filePath).size);
    fs.createReadStream(pres.filePath).pipe(res);
  } catch (error) {
    res.status(500).json({ error: 'Failed to view presentation' });
  }
};

export const updatePresentation = async (req: Request, res: Response) => {
  try {
    const existing = await prisma.presentation.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Not found' });

    // Only uploader or ADMIN can update
    const user = (req as any).user;
    if (user?.role !== 'ADMIN' && existing.uploadedBy !== user?.username) {
      return res.status(403).json({ error: 'Only the uploader or an admin can edit this presentation' });
    }

    const pres = await prisma.presentation.update({ where: { id: req.params.id }, data: req.body });
    res.json(pres);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update' });
  }
};
