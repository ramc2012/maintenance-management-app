import { type MaterialCommunityIcons } from '@expo/vector-icons';

import type { Discipline } from '@/utils/workspace';

export type SubscriptionIconName = keyof typeof MaterialCommunityIcons.glyphMap;

export type ModuleSubscriptionId =
  | 'hub'
  | 'department-mechanical'
  | 'department-electrical'
  | 'department-instrumentation'
  | 'assets'
  | 'operations'
  | 'workorders'
  | 'kpis'
  | 'inspections'
  | 'checklists'
  | 'reports'
  | 'logbook'
  | 'manuals'
  | 'procurement'
  | 'stock'
  | 'workshop'
  | 'energy'
  | 'training'
  | 'calibration'
  | 'collaboration'
  | 'feedback'
  | 'moh'
  | 'manpower'
  | 'contracts'
  | 'presentations'
  | 'inbox'
  | 'settings';

export type ModuleSubscription = {
  id: ModuleSubscriptionId;
  name: string;
  description: string;
  icon: SubscriptionIconName;
  defaultSubscribed: boolean;
  category: 'department' | 'field' | 'manager' | 'system';
};

export const MODULE_SUBSCRIPTION_STORAGE_KEY = 'mm_module_subscriptions_v1';

export const DEPARTMENT_SUBSCRIPTION_BY_DISCIPLINE: Record<Discipline, ModuleSubscriptionId> = {
  MECHANICAL: 'department-mechanical',
  ELECTRICAL: 'department-electrical',
  INSTRUMENTATION: 'department-instrumentation',
};

export const SUBSCRIBABLE_MODULES: ModuleSubscription[] = [
  {
    id: 'hub',
    name: 'Maintenance Hub',
    description: 'Enterprise dashboard',
    icon: 'view-dashboard-outline',
    defaultSubscribed: true,
    category: 'system',
  },
  {
    id: 'department-mechanical',
    name: 'Mechanical',
    description: 'WO, procurement, logbook, reports, and history',
    icon: 'wrench-outline',
    defaultSubscribed: true,
    category: 'department',
  },
  {
    id: 'department-electrical',
    name: 'Electrical',
    description: 'WO, electrical logs, manuals, reports, and requests',
    icon: 'lightning-bolt-outline',
    defaultSubscribed: true,
    category: 'department',
  },
  {
    id: 'department-instrumentation',
    name: 'Instrumentation',
    description: 'WO, calibration, instrument history, reports, and requests',
    icon: 'gauge',
    defaultSubscribed: true,
    category: 'department',
  },
  {
    id: 'operations',
    name: 'Operations Summary',
    description: 'Cross-module operations metrics',
    icon: 'chart-arc',
    defaultSubscribed: true,
    category: 'manager',
  },
  {
    id: 'workorders',
    name: 'Work Orders',
    description: 'Assigned execution and requests',
    icon: 'clipboard-list-outline',
    defaultSubscribed: true,
    category: 'field',
  },
  {
    id: 'reports',
    name: 'Reports',
    description: 'Daily field reporting',
    icon: 'file-document-edit-outline',
    defaultSubscribed: true,
    category: 'field',
  },
  {
    id: 'logbook',
    name: 'Logbook',
    description: 'Running hours and test records',
    icon: 'book-open-page-variant',
    defaultSubscribed: true,
    category: 'field',
  },
  {
    id: 'manuals',
    name: 'Manuals',
    description: 'Drawings and technical documents',
    icon: 'file-document-outline',
    defaultSubscribed: true,
    category: 'field',
  },
  {
    id: 'procurement',
    name: 'Procurement',
    description: 'MRs, cases, approvals, and purchase status',
    icon: 'cart-outline',
    defaultSubscribed: true,
    category: 'field',
  },
  {
    id: 'stock',
    name: 'Stock',
    description: 'Material planning and stores',
    icon: 'package-variant',
    defaultSubscribed: true,
    category: 'field',
  },
  {
    id: 'workshop',
    name: 'Workshop',
    description: 'Shop jobs and repairs',
    icon: 'hammer-wrench',
    defaultSubscribed: true,
    category: 'field',
  },
  {
    id: 'energy',
    name: 'Energy',
    description: 'Fuel and power logs',
    icon: 'lightning-bolt-outline',
    defaultSubscribed: true,
    category: 'field',
  },
  {
    id: 'training',
    name: 'Training',
    description: 'Competency records',
    icon: 'school-outline',
    defaultSubscribed: true,
    category: 'field',
  },
  {
    id: 'assets',
    name: 'Maintenance History',
    description: 'Daily report and work order history',
    icon: 'history',
    defaultSubscribed: true,
    category: 'field',
  },
  {
    id: 'calibration',
    name: 'Calibration',
    description: 'Instrument due list and records',
    icon: 'chart-bell-curve',
    defaultSubscribed: true,
    category: 'field',
  },
  {
    id: 'inspections',
    name: 'Rounds',
    description: 'Optional inspection rounds',
    icon: 'clipboard-check-outline',
    defaultSubscribed: false,
    category: 'field',
  },
  {
    id: 'checklists',
    name: 'Daily Checklist',
    description: 'DPR daily checklists',
    icon: 'clipboard-check-multiple-outline',
    defaultSubscribed: true,
    category: 'field',
  },
  {
    id: 'kpis',
    name: 'KPIs',
    description: 'Performance metrics',
    icon: 'chart-box-outline',
    defaultSubscribed: true,
    category: 'manager',
  },
  {
    id: 'collaboration',
    name: 'Collab',
    description: 'Discussions',
    icon: 'forum-outline',
    defaultSubscribed: true,
    category: 'manager',
  },
  {
    id: 'feedback',
    name: 'Feedback',
    description: 'Improvement board',
    icon: 'message-alert-outline',
    defaultSubscribed: true,
    category: 'manager',
  },
  {
    id: 'moh',
    name: 'MOH',
    description: 'Major overhaul tracking',
    icon: 'engine-outline',
    defaultSubscribed: true,
    category: 'manager',
  },
  {
    id: 'manpower',
    name: 'People',
    description: 'User and manpower management',
    icon: 'account-group-outline',
    defaultSubscribed: true,
    category: 'manager',
  },
  {
    id: 'contracts',
    name: 'Contracts',
    description: 'Contract records',
    icon: 'file-sign',
    defaultSubscribed: true,
    category: 'manager',
  },
  {
    id: 'presentations',
    name: 'Slides',
    description: 'Presentation library',
    icon: 'presentation',
    defaultSubscribed: true,
    category: 'manager',
  },
  {
    id: 'inbox',
    name: 'Inbox',
    description: 'Alerts and notifications',
    icon: 'bell-outline',
    defaultSubscribed: true,
    category: 'system',
  },
  {
    id: 'settings',
    name: 'Settings',
    description: 'Preferences and subscriptions',
    icon: 'cog-outline',
    defaultSubscribed: true,
    category: 'system',
  },
];

export function getDefaultModuleSubscriptions(): Record<ModuleSubscriptionId, boolean> {
  return SUBSCRIBABLE_MODULES.reduce((acc, module) => {
    acc[module.id] = module.defaultSubscribed;
    return acc;
  }, {} as Record<ModuleSubscriptionId, boolean>);
}
