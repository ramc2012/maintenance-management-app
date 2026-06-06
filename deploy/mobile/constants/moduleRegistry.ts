import { type MaterialCommunityIcons } from '@expo/vector-icons';

export type AppIconName = keyof typeof MaterialCommunityIcons.glyphMap;

export type WebModuleLink = {
  id: string;
  name: string;
  description: string;
  path: string;
  icon: AppIconName;
};

export const WEB_MODULE_BASE_URL = 'http://127.0.0.1:8080';

export const WEB_MODULE_LINKS: WebModuleLink[] = [
  { id: 'hub', name: 'Hub', description: 'Enterprise dashboard', path: '/hub', icon: 'view-dashboard-outline' },
  { id: 'assets', name: 'Assets', description: 'Equipment registry', path: '/assets', icon: 'database-outline' },
  { id: 'workorders', name: 'Work Orders', description: 'Execution desk', path: '/workorders', icon: 'clipboard-list-outline' },
  { id: 'kpis', name: 'KPIs', description: 'Performance metrics', path: '/kpis', icon: 'chart-box-outline' },
  { id: 'inspections', name: 'Inspections', description: 'Rounds and checks', path: '/inspections', icon: 'clipboard-check-outline' },
  { id: 'reports', name: 'Reports', description: 'Analytics and logs', path: '/reports', icon: 'file-chart-outline' },
  { id: 'logbooks', name: 'Logbooks', description: 'Operations records', path: '/logbooks', icon: 'book-open-page-variant' },
  { id: 'manuals', name: 'Manuals', description: 'Documents and drawings', path: '/manuals', icon: 'file-document-outline' },
  { id: 'calibration', name: 'Calibration', description: 'Instrument records', path: '/calibration', icon: 'chart-bell-curve' },
  { id: 'procurement', name: 'Procurement', description: 'Cases and approvals', path: '/procurement', icon: 'cart-outline' },
  { id: 'stock', name: 'Stock', description: 'Materials planning', path: '/stock', icon: 'package-variant' },
  { id: 'workshop', name: 'Workshop', description: 'Shop jobs', path: '/workshop', icon: 'hammer-wrench' },
  { id: 'energy', name: 'Energy', description: 'Energy logs', path: '/energy', icon: 'lightning-bolt-outline' },
  { id: 'training', name: 'Training', description: 'Competency records', path: '/training', icon: 'school-outline' },
  { id: 'collaboration', name: 'Collab', description: 'Discussions', path: '/collaboration', icon: 'forum-outline' },
  { id: 'feedback', name: 'Feedback', description: 'Improvement board', path: '/feedback', icon: 'message-alert-outline' },
  { id: 'moh', name: 'MOH', description: 'Major overhaul', path: '/moh', icon: 'engine-outline' },
  { id: 'manpower', name: 'People', description: 'User management', path: '/manpower', icon: 'account-group-outline' },
  { id: 'contracts', name: 'Contracts', description: 'Contract records', path: '/contracts', icon: 'file-sign' },
  { id: 'presentations', name: 'Slides', description: 'Presentation hub', path: '/presentations', icon: 'presentation' },
  { id: 'settings', name: 'Settings', description: 'Preferences', path: '/settings', icon: 'cog-outline' },
];

export function buildWebModuleUrl(path: string) {
  return `${WEB_MODULE_BASE_URL}${path}`;
}
