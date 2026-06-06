import type { PrismaClient, Discipline, DisciplineAccessLevel } from '@prisma/client';

export const ALL_DISCIPLINES: Discipline[] = ['MECHANICAL', 'ELECTRICAL', 'INSTRUMENTATION'];

export type UserPersona = 'MANAGER' | 'FIELD' | 'HYBRID';

export interface DisciplineAccessSummary {
  discipline: Discipline;
  accessLevel: DisciplineAccessLevel;
  isDefault: boolean;
  canViewProcurement: boolean;
  canUpdateProcurement: boolean;
  canRaiseRequirements: boolean;
}

export interface CapabilityManifest {
  managerOverview: boolean;
  fieldWorkspace: boolean;
  workspaces: Discipline[];
  canViewProcurement: boolean;
  canUpdateProcurement: boolean;
  canRaiseRequirements: boolean;
  canUseLogbook: boolean;
  canUseCalibration: boolean;
  canManageUsers: boolean;
}

export interface UserAccessShape {
  id: string;
  username: string;
  role: string;
  jobTitle?: string | null;
  canCreateWorkOrder?: boolean;
  canCloseWorkOrder?: boolean;
  department?: { name: string } | null;
  disciplineAccesses?: Array<{
    discipline: Discipline;
    accessLevel: DisciplineAccessLevel;
    isDefault: boolean;
    canViewProcurement: boolean;
    canUpdateProcurement: boolean;
    canRaiseRequirements: boolean;
  }>;
}

export interface AuthUserPayload {
  id: string;
  username: string;
  role: string;
  persona: UserPersona;
  defaultDiscipline: Discipline | null;
  disciplineAccess: DisciplineAccessSummary[];
  capabilities: CapabilityManifest;
  canCreateWorkOrder: boolean;
  canCloseWorkOrder: boolean;
}

const MANAGER_ROLES = new Set(['ADMIN', 'HOD']);
const HYBRID_ROLES = new Set(['ENGINEER']);
const PROCUREMENT_REGEX = /(procurement|buyer|materials|hpo|cpd)/i;

const uniqueAccesses = (accesses: DisciplineAccessSummary[]) => {
  const seen = new Set<Discipline>();
  return accesses.filter((access) => {
    if (seen.has(access.discipline)) {
      return false;
    }
    seen.add(access.discipline);
    return true;
  });
};

export const normalizeDiscipline = (value: unknown): Discipline | null => {
  if (!value) return null;
  const normalized = String(value).trim().toUpperCase();
  return ALL_DISCIPLINES.find((discipline) => discipline === normalized) ?? null;
};

export const mapCategoryToDiscipline = (value: unknown): Discipline => {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'electrical') return 'ELECTRICAL';
  if (normalized === 'instrumentation') return 'INSTRUMENTATION';
  return 'MECHANICAL';
};

export const inferDisciplineFromText = (value: unknown): Discipline | null => {
  const haystack = String(value || '').trim().toLowerCase();
  if (!haystack) return null;
  if (/(instr|instrument|transmitter|analyzer|control valve|flow|pressure|temperature|loop|calibration)/.test(haystack)) {
    return 'INSTRUMENTATION';
  }
  if (/(elect|power|motor|generator|transformer|switchgear|mcc|panel|ups|cable|lighting|relay)/.test(haystack)) {
    return 'ELECTRICAL';
  }
  if (/(mech|compressor|pump|valve|bearing|rotating|skid|diesel|engine|turbine|vessel|separator|heat exchanger)/.test(haystack)) {
    return 'MECHANICAL';
  }
  return null;
};

export const buildDisciplineAccess = (user: UserAccessShape): DisciplineAccessSummary[] => {
  const explicit = uniqueAccesses(
    (user.disciplineAccesses || []).map((access) => ({
      discipline: access.discipline,
      accessLevel: access.accessLevel,
      isDefault: access.isDefault,
      canViewProcurement: access.canViewProcurement,
      canUpdateProcurement: access.canUpdateProcurement,
      canRaiseRequirements: access.canRaiseRequirements,
    })),
  );

  if (explicit.length > 0) {
    return explicit;
  }

  if (MANAGER_ROLES.has(user.role) || HYBRID_ROLES.has(user.role)) {
    return ALL_DISCIPLINES.map((discipline, index) => ({
      discipline,
      accessLevel: 'MANAGE',
      isDefault: index === 0,
      canViewProcurement: true,
      canUpdateProcurement: true,
      canRaiseRequirements: true,
    }));
  }

  const inferred =
    inferDisciplineFromText(user.department?.name) ||
    inferDisciplineFromText(user.jobTitle) ||
    inferDisciplineFromText(user.username);

  if (inferred) {
    return [
      {
        discipline: inferred,
        accessLevel: PROCUREMENT_REGEX.test(`${user.jobTitle || ''} ${user.username}`) ? 'MANAGE' : 'EXECUTE',
        isDefault: true,
        canViewProcurement: true,
        canUpdateProcurement: PROCUREMENT_REGEX.test(`${user.jobTitle || ''} ${user.username}`),
        canRaiseRequirements: true,
      },
    ];
  }

  return ALL_DISCIPLINES.map((discipline, index) => ({
    discipline,
    accessLevel: PROCUREMENT_REGEX.test(`${user.jobTitle || ''} ${user.username}`) ? 'MANAGE' : 'EXECUTE',
    isDefault: index === 0,
    canViewProcurement: true,
    canUpdateProcurement: PROCUREMENT_REGEX.test(`${user.jobTitle || ''} ${user.username}`),
    canRaiseRequirements: true,
  }));
};

export const determinePersona = (user: UserAccessShape, access: DisciplineAccessSummary[]): UserPersona => {
  if (MANAGER_ROLES.has(user.role)) {
    return 'MANAGER';
  }
  if (HYBRID_ROLES.has(user.role)) {
    return 'HYBRID';
  }
  return 'FIELD';
};

export const buildCapabilities = (user: UserAccessShape, persona: UserPersona, access: DisciplineAccessSummary[]): CapabilityManifest => {
  const workspaces = access.map((entry) => entry.discipline);
  return {
    managerOverview: persona !== 'FIELD',
    fieldWorkspace: access.length > 0,
    workspaces,
    canViewProcurement: access.some((entry) => entry.canViewProcurement),
    canUpdateProcurement: access.some((entry) => entry.canUpdateProcurement),
    canRaiseRequirements: access.some((entry) => entry.canRaiseRequirements),
    canUseLogbook: workspaces.some((discipline) => discipline !== 'INSTRUMENTATION'),
    canUseCalibration: workspaces.includes('INSTRUMENTATION'),
    canManageUsers: user.role === 'ADMIN' || user.role === 'HOD',
  };
};

export const buildAuthUserPayload = (user: UserAccessShape): AuthUserPayload => {
  const disciplineAccess = buildDisciplineAccess(user);
  const persona = determinePersona(user, disciplineAccess);
  const defaultDiscipline =
    disciplineAccess.find((entry) => entry.isDefault)?.discipline ||
    disciplineAccess[0]?.discipline ||
    null;

  return {
    id: user.id,
    username: user.username,
    role: user.role,
    persona,
    defaultDiscipline,
    disciplineAccess,
    capabilities: buildCapabilities(user, persona, disciplineAccess),
    canCreateWorkOrder: Boolean(user.canCreateWorkOrder),
    canCloseWorkOrder: Boolean(user.canCloseWorkOrder),
  };
};

export const getAllowedDisciplines = (user?: AuthUserPayload | null) => {
  if (!user) return ALL_DISCIPLINES;
  if (user.persona === 'MANAGER') return ALL_DISCIPLINES;
  return user.disciplineAccess.map((entry) => entry.discipline);
};

const getAccessEntry = (user: AuthUserPayload | undefined, discipline: Discipline | null) => {
  if (!user || !discipline) return null;
  return user.disciplineAccess.find((entry) => entry.discipline === discipline) || null;
};

export const resolveScopedDisciplines = (user: AuthUserPayload | undefined, requested: unknown) => {
  const normalized = normalizeDiscipline(requested);
  const allowed = getAllowedDisciplines(user);

  if (!normalized) {
    return allowed;
  }

  if (!allowed.includes(normalized)) {
    const error = new Error(`Discipline ${normalized} is not available for this user.`);
    (error as Error & { status?: number }).status = 403;
    throw error;
  }

  return [normalized];
};

export const canRaiseRequirementsForDiscipline = (user: AuthUserPayload | undefined, discipline: Discipline | null) => {
  if (!user || !discipline) return false;
  if (user.persona === 'MANAGER') return true;
  return Boolean(getAccessEntry(user, discipline)?.canRaiseRequirements);
};

export const canUpdateProcurementForDiscipline = (user: AuthUserPayload | undefined, discipline: Discipline | null) => {
  if (!user || !discipline) return false;
  if (user.persona === 'MANAGER') return true;
  return Boolean(getAccessEntry(user, discipline)?.canUpdateProcurement);
};

export const applyDisciplineScope = (
  where: Record<string, unknown>,
  fieldName: string,
  disciplines: Discipline[],
) => {
  if (!disciplines.length || disciplines.length === ALL_DISCIPLINES.length) {
    return where;
  }

  where[fieldName] = disciplines.length === 1 ? disciplines[0] : { in: disciplines };
  return where;
};

export const resolvePrimaryDisciplineForText = (value: unknown, fallback: Discipline = 'MECHANICAL'): Discipline =>
  inferDisciplineFromText(value) || fallback;

export const resolvePrimaryDisciplineForEquipmentTag = async (
  prisma: PrismaClient,
  equipmentTag: string | null | undefined,
  fallback: Discipline = 'MECHANICAL',
): Promise<Discipline> => {
  const normalizedTag = String(equipmentTag || '').trim();
  if (!normalizedTag) return fallback;

  const [instrument, equipment] = await Promise.all([
    prisma.instrumentMaster.findUnique({
      where: { tagId: normalizedTag },
      select: { primaryDiscipline: true },
    }),
    prisma.runningEquipmentMaster.findUnique({
      where: { equipmentTag: normalizedTag },
      select: { primaryDiscipline: true },
    }),
  ]);

  return instrument?.primaryDiscipline || equipment?.primaryDiscipline || fallback;
};
