// Shared TypeScript types for the Daily Checklist / DPR module.

export interface HeaderField {
  key: string;
  label: string;
  type: 'text';
  default?: string;
}

export interface ParameterCol {
  key: string;
  label: string;
}

export interface ParameterItem {
  key: string;
  label: string;
  unit?: string;
  note?: string;
  cols?: ParameterCol[];
}

export interface StatusListItem {
  key: string;
  label: string;
  defaultValue?: string;
}

export interface InspectionGroupItem {
  key: string;
  label: string;
}

export interface InspectionGroup {
  key: string;
  title: string;
  items: InspectionGroupItem[];
}

export interface WorkLogShift {
  key: string;
  label: string;
}

export interface SignoffItem {
  key: string;
  label: string;
}

export interface ParametersSection {
  key: string;
  title: string;
  type: 'PARAMETERS';
  items: ParameterItem[];
}

export interface StatusListSection {
  key: string;
  title: string;
  type: 'STATUS_LIST';
  items: StatusListItem[];
}

export interface InspectionGroupSection {
  key: string;
  title: string;
  type: 'INSPECTION_GROUP';
  groups: InspectionGroup[];
}

export interface WorkLogSection {
  key: string;
  title: string;
  type: 'WORK_LOG';
  shifts: WorkLogShift[];
}

export interface SignoffSection {
  key: string;
  title: string;
  type: 'SIGNOFF';
  items: SignoffItem[];
}

export type Section =
  | ParametersSection
  | StatusListSection
  | InspectionGroupSection
  | WorkLogSection
  | SignoffSection;

export interface ChecklistTemplate {
  id: string;
  code: string;
  name: string;
  discipline: string;
  description?: string;
  rigType?: string;
  headerFields: HeaderField[];
  sections: Section[];
  isActive: boolean;
  _count?: { submissions: number };
}

export type SubmissionStatus = 'DRAFT' | 'SUBMITTED';
export type ItemStatus = 'OK' | 'ATTENTION' | 'NA';

export interface ChecklistSubmission {
  id: string;
  templateId: string;
  template?: ChecklistTemplate;
  date: string;
  shift?: string;
  header: Record<string, string>;
  responses: Record<string, any>;
  status: SubmissionStatus;
  flaggedCount: number;
  remarks?: string;
  shiftInchargeSign?: string;
  deptInchargeSign?: string;
  submittedBy?: string;
  submittedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// Lighter shape returned by the list endpoint (template summary only).
export interface ChecklistSubmissionListItem extends ChecklistSubmission {
  template?: ChecklistTemplate & {
    id: string;
    code: string;
    name: string;
    discipline: string;
  };
}
