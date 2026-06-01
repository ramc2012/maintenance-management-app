import { randomUUID } from 'crypto';
import fs from 'fs';
import { promises as fsPromises } from 'fs';
import path from 'path';
import { Prisma } from '@prisma/client';
import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { ensureManualRepositoryStructure } from '../services/manualRepositoryService';
import { applyDisciplineScope, mapCategoryToDiscipline, resolveScopedDisciplines } from '../services/disciplineAccess';

const VALID_CATEGORIES = ['mechanical', 'electrical', 'instrumentation'] as const;
const STORAGE_ROOT = path.resolve(__dirname, '../../storage/manuals');

const normalizeText = (value: unknown) => String(value || '').trim();
const normalizeCategory = (value: unknown) => normalizeText(value).toLowerCase();

const isValidCategory = (category: string): category is (typeof VALID_CATEGORIES)[number] =>
  VALID_CATEGORIES.includes(category as (typeof VALID_CATEGORIES)[number]);

const folderSelect = {
  id: true,
  name: true,
  category: true,
  parentId: true,
  createdAt: true,
  updatedAt: true,
  documents: {
    orderBy: [{ originalName: 'asc' }],
    select: {
      id: true,
      originalName: true,
      storedName: true,
      mimeType: true,
      extension: true,
      size: true,
      repositoryPath: true,
      uploadedAt: true,
      uploadedBy: {
        select: {
          id: true,
          username: true,
        },
      },
    },
  },
} satisfies Prisma.ManualFolderSelect;

type FolderWithDocuments = Prisma.ManualFolderGetPayload<{ select: typeof folderSelect }>;

const ensureStorageRoot = async () => {
  await fsPromises.mkdir(STORAGE_ROOT, { recursive: true });
};

const getFolderOrThrow = async (folderId: string) => {
  const folder = await prisma.manualFolder.findUnique({
    where: { id: folderId },
    select: { id: true, name: true, category: true, parentId: true },
  });

  if (!folder) {
    throw new Error('Folder not found');
  }

  return folder;
};

const getDescendantFolderIds = async (folderId: string) => {
  const allFolders = await prisma.manualFolder.findMany({
    select: { id: true, parentId: true },
  });

  const rootFolderExists = allFolders.some((folder) => folder.id === folderId);
  if (!rootFolderExists) {
    return [];
  }

  const descendants: string[] = [];
  const queue = [folderId];

  while (queue.length > 0) {
    const currentId = queue.shift();
    if (!currentId) {
      continue;
    }

    descendants.push(currentId);
    const children = allFolders.filter((folder) => folder.parentId === currentId);
    children.forEach((child) => queue.push(child.id));
  }

  return descendants;
};

const removeFileIfExists = async (absolutePath: string) => {
  try {
    await fsPromises.unlink(absolutePath);
  } catch (error: any) {
    if (error?.code !== 'ENOENT') {
      throw error;
    }
  }
};

const removeDocumentFiles = async (documentPaths: string[]) => {
  await Promise.all(documentPaths.map((documentPath) => removeFileIfExists(path.resolve(STORAGE_ROOT, documentPath))));
};

const sanitizeFileName = (fileName: string) =>
  fileName
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

const formatFolderResponse = (folders: FolderWithDocuments[]) =>
  folders.map((folder) => ({
    ...folder,
    documents: folder.documents.map((document) => ({
      ...document,
      fileName: document.originalName,
      canPreview:
        document.mimeType.startsWith('image/') ||
        document.mimeType === 'application/pdf' ||
        document.mimeType.startsWith('text/'),
    })),
  }));

export const getRepository = async (req: Request, res: Response) => {
  const category = req.query.category ? normalizeCategory(req.query.category) : undefined;

  if (category && !isValidCategory(category)) {
    return res.status(400).json({ error: 'Invalid repository category' });
  }

  try {
    await ensureStorageRoot();
    await ensureManualRepositoryStructure();

    const where: any = category ? { category } : {};
    applyDisciplineScope(where, 'primaryDiscipline', resolveScopedDisciplines(req.user, category ? mapCategoryToDiscipline(category) : req.query.discipline));

    const folders = await prisma.manualFolder.findMany({
      where,
      select: folderSelect,
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });

    return res.json({ folders: formatFolderResponse(folders) });
  } catch (error) {
    console.error('Failed to fetch repository', error);
    return res.status(500).json({ error: 'Failed to fetch repository' });
  }
};

export const createFolder = async (req: Request, res: Response) => {
  const name = normalizeText(req.body?.name);
  const requestedCategory = normalizeCategory(req.body?.category);
  const parentId = normalizeText(req.body?.parentId) || undefined;

  if (!name) {
    return res.status(400).json({ error: 'Folder name is required' });
  }

  try {
    let category = requestedCategory;

    if (parentId) {
      const parentFolder = await getFolderOrThrow(parentId);
      category = parentFolder.category;
    }

    if (!category || !isValidCategory(category)) {
      return res.status(400).json({ error: 'A valid category is required' });
    }

    const folder = await prisma.manualFolder.create({
      data: {
        name,
        category,
        primaryDiscipline: mapCategoryToDiscipline(category),
        parentId: parentId ?? null,
      },
      select: folderSelect,
    });

    return res.status(201).json(folder);
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }

    console.error('Failed to create folder', error);
    return res.status(500).json({ error: 'Failed to create folder' });
  }
};

export const updateFolder = async (req: Request, res: Response) => {
  const { id } = req.params;
  const name = req.body?.name === undefined ? undefined : normalizeText(req.body.name);

  if (name !== undefined && !name) {
    return res.status(400).json({ error: 'Folder name cannot be empty' });
  }

  try {
    const folder = await prisma.manualFolder.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name } : {}),
      },
      select: folderSelect,
    });

    return res.json(folder);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return res.status(404).json({ error: 'Folder not found' });
    }

    console.error('Failed to update folder', error);
    return res.status(500).json({ error: 'Failed to update folder' });
  }
};

export const deleteFolder = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const folderIds = await getDescendantFolderIds(id);
    if (folderIds.length === 0) {
      return res.status(404).json({ error: 'Folder not found' });
    }

    const documents = await prisma.repositoryDocument.findMany({
      where: { folderId: { in: folderIds } },
      select: { id: true, repositoryPath: true },
    });

    await removeDocumentFiles(documents.map((document) => document.repositoryPath));

    await prisma.$transaction([
      prisma.repositoryDocument.deleteMany({ where: { folderId: { in: folderIds } } }),
      prisma.manualFolder.deleteMany({ where: { id: { in: folderIds } } }),
    ]);

    return res.json({ message: 'Folder deleted successfully' });
  } catch (error) {
    console.error('Failed to delete folder', error);
    return res.status(500).json({ error: 'Failed to delete folder' });
  }
};

export const uploadDocuments = async (req: Request, res: Response) => {
  const folderId = normalizeText(req.params.id);
  const files = (req.files || []) as Express.Multer.File[];

  if (!folderId) {
    return res.status(400).json({ error: 'Folder is required' });
  }

  if (!files.length) {
    return res.status(400).json({ error: 'At least one file must be uploaded' });
  }

  try {
    const folder = await getFolderOrThrow(folderId);
    await ensureStorageRoot();

    const targetDirectory = path.join(STORAGE_ROOT, folder.category, folder.id);
    await fsPromises.mkdir(targetDirectory, { recursive: true });

    const createdDocuments = [];

    for (const file of files) {
      const extension = path.extname(file.originalname).replace(/^\./, '').toLowerCase() || null;
      const sanitizedOriginalName = sanitizeFileName(file.originalname) || `document-${randomUUID()}`;
      const storedName = `${Date.now()}-${randomUUID()}-${sanitizedOriginalName}`;
      const finalAbsolutePath = path.join(targetDirectory, storedName);
      const relativeRepositoryPath = path.relative(STORAGE_ROOT, finalAbsolutePath);

      await fsPromises.rename(file.path, finalAbsolutePath);

      const document = await prisma.repositoryDocument.create({
        data: {
          folderId: folder.id,
          primaryDiscipline: folder.category === 'instrumentation' ? 'INSTRUMENTATION' : folder.category === 'electrical' ? 'ELECTRICAL' : 'MECHANICAL',
          originalName: file.originalname,
          storedName,
          mimeType: file.mimetype || 'application/octet-stream',
          extension,
          size: file.size,
          repositoryPath: relativeRepositoryPath,
          uploadedById: req.user!.id,
        },
        select: {
          id: true,
          originalName: true,
          storedName: true,
          mimeType: true,
          extension: true,
          size: true,
          repositoryPath: true,
          uploadedAt: true,
          uploadedBy: {
            select: {
              id: true,
              username: true,
            },
          },
        },
      });

      createdDocuments.push(document);
    }

    return res.status(201).json({ documents: createdDocuments });
  } catch (error) {
    await Promise.all(
      files.map(async (file) => {
        if (file.path) {
          await removeFileIfExists(file.path);
        }
      })
    );

    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }

    console.error('Failed to upload documents', error);
    return res.status(500).json({ error: 'Failed to upload documents' });
  }
};

export const deleteDocument = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const document = await prisma.repositoryDocument.findUnique({
      where: { id },
      select: { id: true, repositoryPath: true, uploadedById: true },
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Only uploader or ADMIN can delete
    const user = (req as any).user;
    if (user?.role !== 'ADMIN' && document.uploadedById && document.uploadedById !== user?.id) {
      return res.status(403).json({ error: 'Only the uploader or an admin can delete this document' });
    }

    await removeFileIfExists(path.resolve(STORAGE_ROOT, document.repositoryPath));
    await prisma.repositoryDocument.delete({ where: { id } });

    return res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Failed to delete document', error);
    return res.status(500).json({ error: 'Failed to delete document' });
  }
};

export const streamDocumentContent = async (req: Request, res: Response) => {
  const { id } = req.params;
  const download = String(req.query.download || '').toLowerCase() === 'true';

  try {
    const document = await prisma.repositoryDocument.findUnique({
      where: { id },
      select: {
        id: true,
        originalName: true,
        mimeType: true,
        repositoryPath: true,
      },
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const absolutePath = path.resolve(STORAGE_ROOT, document.repositoryPath);
    if (!fs.existsSync(absolutePath)) {
      return res.status(404).json({ error: 'Document file is missing from the repository' });
    }

    res.setHeader(
      'Content-Disposition',
      `${download ? 'attachment' : 'inline'}; filename="${encodeURIComponent(document.originalName)}"`
    );
    res.setHeader('Content-Type', document.mimeType || 'application/octet-stream');

    return res.sendFile(absolutePath);
  } catch (error) {
    console.error('Failed to stream document content', error);
    return res.status(500).json({ error: 'Failed to open document' });
  }
};
