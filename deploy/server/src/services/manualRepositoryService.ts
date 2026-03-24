import prisma from '../lib/prisma';

const VALID_CATEGORIES = ['mechanical', 'electrical', 'instrumentation'] as const;
const DEFAULT_FOLDERS: Record<(typeof VALID_CATEGORIES)[number], string[]> = {
  mechanical: ['Equipment Manuals', 'P&ID Drawings'],
  electrical: ['Motor Manuals', 'SLD Drawings'],
  instrumentation: ['Transmitter Manuals', 'Loop Diagrams'],
};
const COMMON_FOLDER_NAME = 'Common';

const normalizeFolderName = (value: string) => value.trim().replace(/\s+/g, ' ');

const uniqueRootFolders = (values: string[]) => {
  const seen = new Set<string>();
  return values.filter((value) => {
    const normalized = normalizeFolderName(value).toLowerCase();
    if (!normalized || seen.has(normalized)) {
      return false;
    }
    seen.add(normalized);
    return true;
  });
};

export const ensureManualRepositoryStructure = async () => {
  const [departments, rootFolders] = await Promise.all([
    prisma.department.findMany({
      select: { name: true },
      orderBy: { name: 'asc' },
    }),
    prisma.manualFolder.findMany({
      where: { parentId: null },
      select: { id: true, category: true, name: true },
    }),
  ]);

  const existingRootFolderKeys = new Set(
    rootFolders.map((folder) => `${folder.category}::${normalizeFolderName(folder.name).toLowerCase()}`)
  );

  const departmentFolders = departments.map((department) => normalizeFolderName(department.name)).filter(Boolean);
  const rootFolderDefinitions = VALID_CATEGORIES.flatMap((category) =>
    uniqueRootFolders([COMMON_FOLDER_NAME, ...departmentFolders, ...DEFAULT_FOLDERS[category]]).map((name) => ({
      category,
      name,
    }))
  );

  const missingFolders = rootFolderDefinitions.filter(
    (folder) => !existingRootFolderKeys.has(`${folder.category}::${folder.name.toLowerCase()}`)
  );

  if (!missingFolders.length) {
    return;
  }

  await prisma.$transaction(
    missingFolders.map((folder) =>
      prisma.manualFolder.create({
        data: {
          name: folder.name,
          category: folder.category,
          parentId: null,
        },
      })
    )
  );
};
