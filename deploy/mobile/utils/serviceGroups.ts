export interface ServiceOption {
  value: string;
  label: string;
}

const SERVICE_GROUPS: Array<{ value: string; label: string; aliases: string[] }> = [
  { value: 'ds', label: 'DS', aliases: ['ds', 'drilling services'] },
  { value: 'surface', label: 'Surface', aliases: ['surface', 'st', 'surface team'] },
  { value: 'well-services', label: 'Well Services', aliases: ['ws', 'well services', 'well service', 'workover rig', 'workover rigs', 'workover'] },
  { value: 'drilling', label: 'Drilling Rig', aliases: ['drilling', 'drilling rig', 'rig'] },
  { value: 'mobile', label: 'Mobile Units', aliases: ['mobile', 'mobile unit', 'mobile units'] },
];

const normalize = (value?: string | null) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ');

export const canonicalServiceKey = (value?: string | null) => {
  const normalized = normalize(value);
  if (!normalized) return 'unassigned';
  const group = SERVICE_GROUPS.find((entry) => entry.value === normalized || entry.aliases.includes(normalized));
  return group?.value || normalized;
};

export const displayService = (value?: string | null) => {
  const key = canonicalServiceKey(value);
  const group = SERVICE_GROUPS.find((entry) => entry.value === key);
  if (group) return group.label;
  if (key === 'unassigned') return 'Unassigned';
  return key.replace(/\b\w/g, (char) => char.toUpperCase());
};

export const uniqueServiceOptions = (values: Array<string | null | undefined>): ServiceOption[] => {
  const map = new Map<string, string>();
  values.forEach((value) => {
    const key = canonicalServiceKey(value);
    if (key !== 'unassigned' && !map.has(key)) {
      map.set(key, displayService(value));
    }
  });
  return Array.from(map.entries())
    .map(([value, label]) => ({ value, label }))
    .sort((left, right) => left.label.localeCompare(right.label));
};
