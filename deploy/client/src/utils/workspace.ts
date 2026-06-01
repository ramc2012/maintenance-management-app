export type Discipline = 'MECHANICAL' | 'ELECTRICAL' | 'INSTRUMENTATION';
export type UserPersona = 'MANAGER' | 'FIELD' | 'HYBRID';
export const VALID_DISCIPLINES: Discipline[] = ['MECHANICAL', 'ELECTRICAL', 'INSTRUMENTATION'];

export interface DisciplineAccess {
  discipline: Discipline;
  accessLevel: 'VIEW' | 'EXECUTE' | 'MANAGE';
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

export interface WorkspaceUser {
  id: string;
  username: string;
  role: string;
  persona?: UserPersona;
  defaultDiscipline?: Discipline | null;
  disciplineAccess?: DisciplineAccess[];
  capabilities?: CapabilityManifest;
  canCreateWorkOrder?: boolean;
  canCloseWorkOrder?: boolean;
}

const LEGACY_FIELD_ROUTES = new Set([
  '/hub',
  '/',
  '/assets',
  '/operations',
  '/workorders',
  '/reports',
  '/procurement',
  '/manuals',
  '/logbooks',
  '/calibration',
]);

export const disciplineToSegment = (discipline: Discipline) => discipline.toLowerCase();

export const parseDiscipline = (value: string | null | undefined): Discipline | null => {
  if (!value) return null;
  const normalized = value.toUpperCase();
  return VALID_DISCIPLINES.includes(normalized as Discipline) ? (normalized as Discipline) : null;
};

export const disciplineToLabel = (discipline: Discipline) =>
  discipline.charAt(0) + discipline.slice(1).toLowerCase();

export const disciplineToManualCategory = (discipline: Discipline) => discipline.toLowerCase();

export const getDefaultDiscipline = (user: WorkspaceUser | null | undefined): Discipline | null =>
  user?.defaultDiscipline ||
  user?.disciplineAccess?.find((entry) => entry.isDefault)?.discipline ||
  user?.disciplineAccess?.[0]?.discipline ||
  null;

export const getUserHomePath = (user: WorkspaceUser | null | undefined) => {
  if (!user) return '/hub';
  if (user.persona === 'FIELD') {
    if ((user.disciplineAccess?.length || 0) > 1) {
      return '/workspaces';
    }
    const discipline = getDefaultDiscipline(user);
    return discipline ? `/${disciplineToSegment(discipline)}` : '/workspaces';
  }
  return '/hub';
};

export const hasDisciplineAccess = (user: WorkspaceUser | null | undefined, discipline: Discipline) =>
  Boolean(user?.disciplineAccess?.some((entry) => entry.discipline === discipline));

export const shouldRedirectFieldUserFromLegacyRoute = (
  user: WorkspaceUser | null | undefined,
  pathname: string,
  search: string,
) => {
  if (user?.persona !== 'FIELD' || !LEGACY_FIELD_ROUTES.has(pathname)) {
    return false;
  }

  if (pathname === '/hub' || pathname === '/') {
    return true;
  }

  const params = new URLSearchParams(search);

  if (pathname === '/manuals') {
    return !params.get('category');
  }

  if (pathname === '/calibration') {
    return params.get('discipline') !== 'INSTRUMENTATION';
  }

  return !params.get('discipline');
};

export const getWorkspaceModuleHref = (discipline: Discipline, moduleKey: string) => {
  const disciplineQuery = `discipline=${discipline}`;
  switch (moduleKey) {
    case 'equipment':
      return `/assets?view=equipment-registry&${disciplineQuery}`;
    case 'operations':
      return `/operations?${disciplineQuery}`;
    case 'history':
      return discipline === 'INSTRUMENTATION'
        ? `/calibration?view=history&${disciplineQuery}`
        : `/assets?view=history&${disciplineQuery}`;
    case 'workorders':
      return `/workorders?${disciplineQuery}`;
    case 'reports':
      return `/reports?${disciplineQuery}`;
    case 'procurement':
      return `/procurement?${disciplineQuery}`;
    case 'manuals':
      return `/manuals?category=${disciplineToManualCategory(discipline)}&${disciplineQuery}`;
    case 'logbook':
      return `/logbooks?${disciplineQuery}`;
    case 'calibration':
      return `/calibration?${disciplineQuery}`;
    default:
      return `/${disciplineToSegment(discipline)}`;
  }
};
