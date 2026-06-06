import type { AuthUser } from '@/services/authStorage';

export type Discipline = 'MECHANICAL' | 'ELECTRICAL' | 'INSTRUMENTATION';
export type UserPersona = 'MANAGER' | 'FIELD' | 'HYBRID';

export function disciplineToLabel(discipline: Discipline) {
  switch (discipline) {
    case 'MECHANICAL':
      return 'Mechanical';
    case 'ELECTRICAL':
      return 'Electrical';
    case 'INSTRUMENTATION':
      return 'Instrumentation';
  }
}

export function disciplineToSegment(discipline: Discipline) {
  return discipline.toLowerCase();
}

export function getDefaultDiscipline(user: AuthUser | null | undefined): Discipline | null {
  return (
    user?.defaultDiscipline ||
    user?.disciplineAccess?.find((entry) => entry.isDefault)?.discipline ||
    user?.disciplineAccess?.[0]?.discipline ||
    null
  );
}

export function getAssignedDisciplines(user: AuthUser | null | undefined): Discipline[] {
  return (user?.disciplineAccess ?? []).map((entry) => entry.discipline);
}
